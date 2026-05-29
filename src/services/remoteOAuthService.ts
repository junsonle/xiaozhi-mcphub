import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import { getMcpServerService } from './mcpServerService.js';
import type { PendingOAuthAuth, RemoteOAuthClientInformation, RemoteOAuthTokens, ServerConfig } from '../types/index.js';
import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthClientInformationFull, OAuthClientMetadata, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';

type RemoteOAuthState = {
  state?: string;
  codeVerifier?: string;
  clientInformation?: RemoteOAuthClientInformation;
  tokens?: RemoteOAuthTokens;
  authUrl?: string;
  createdAt?: number;
};

const PENDING_AUTH_TTL_MS = 10 * 60 * 1000;

const pendingAuths = new Map<string, PendingOAuthAuth & { createdAt: number }>();

const cleanupPendingAuths = (): void => {
  const now = Date.now();
  for (const [serverName, pendingAuth] of pendingAuths.entries()) {
    if (now - pendingAuth.createdAt > PENDING_AUTH_TTL_MS) {
      pendingAuths.delete(serverName);
    }
  }
};

const getTokenDir = (): string => path.resolve(process.cwd(), 'data', 'oauth-tokens');

const sanitizeName = (name: string): string => name.replace(/[^a-zA-Z0-9_-]/g, '_');

const getDefaultTokenFile = (serverName: string): string =>
  path.join(getTokenDir(), `${sanitizeName(serverName)}.json`);

const resolveTokenFile = (serverName: string, serverConfig?: ServerConfig): string =>
  path.resolve(process.cwd(), serverConfig?.auth?.tokenFile || getDefaultTokenFile(serverName));

const readState = (filePath: string): RemoteOAuthState => {
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as RemoteOAuthState;
  } catch (error) {
    console.warn(`Failed to read OAuth state from ${filePath}:`, error);
    return {};
  }
};

const writeState = (filePath: string, state: RemoteOAuthState): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
};

const removeStateParts = (
  filePath: string,
  scope: 'all' | 'client' | 'tokens' | 'verifier',
): void => {
  if (scope === 'all') {
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      // ignore
    }
    return;
  }

  const state = readState(filePath);
  if (scope === 'client') {
    delete state.clientInformation;
  } else if (scope === 'tokens') {
    delete state.tokens;
  } else if (scope === 'verifier') {
    delete state.codeVerifier;
    delete state.state;
  }
  writeState(filePath, state);
};

const buildRedirectUrl = (serverName: string): string => {
  const basePath = config.basePath || '';
  const baseUrl = `http://localhost:${config.port}${basePath}`;
  return `${baseUrl}/api/oauth/callback/${encodeURIComponent(serverName)}`;
};

const openBrowser = async (url: string): Promise<void> => {
  const escapedUrl = url.replace(/"/g, '\\"');

  const command =
    process.platform === 'win32'
      ? `start "" "${escapedUrl}"`
      : process.platform === 'darwin'
        ? `open "${escapedUrl}"`
        : `xdg-open "${escapedUrl}"`;

  const { exec } = await import('child_process');
  exec(command, (error) => {
    if (error) {
      console.warn(`Failed to open OAuth authorization URL automatically: ${url}`, error);
    }
  });
};

class RemoteMcpOAuthProvider implements OAuthClientProvider {
  private readonly serverName: string;
  private readonly serverConfig: ServerConfig;
  private readonly tokenFile: string;
  private currentState?: string;

  constructor(serverName: string, serverConfig: ServerConfig) {
    this.serverName = serverName;
    this.serverConfig = serverConfig;
    this.tokenFile = resolveTokenFile(serverName, serverConfig);
  }

  get redirectUrl(): string {
    return buildRedirectUrl(this.serverName);
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: 'xiaozhi-mcphub',
      redirect_uris: [this.redirectUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: this.serverConfig.auth?.clientSecret ? 'client_secret_post' : 'none',
      scope: this.serverConfig.auth?.scopes || 'openid profile email offline_access',
    };
  }

  async state(): Promise<string> {
    const state = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.currentState = state;
    const stored = readState(this.tokenFile);
    writeState(this.tokenFile, {
      ...stored,
      state,
      createdAt: Date.now(),
    });
    return state;
  }

  async clientInformation(): Promise<RemoteOAuthClientInformation | undefined> {
    if (this.serverConfig.auth?.clientId) {
      return {
        client_id: this.serverConfig.auth.clientId,
        client_secret: this.serverConfig.auth.clientSecret,
      };
    }

    return readState(this.tokenFile).clientInformation;
  }

  async saveClientInformation(clientInformation: OAuthClientInformationFull): Promise<void> {
    const stored = readState(this.tokenFile);
    writeState(this.tokenFile, {
      ...stored,
      clientInformation: {
        client_id: clientInformation.client_id,
        client_secret: clientInformation.client_secret,
        client_id_issued_at: clientInformation.client_id_issued_at,
        client_secret_expires_at: clientInformation.client_secret_expires_at,
      },
      createdAt: Date.now(),
    });
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    return readState(this.tokenFile).tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const stored = readState(this.tokenFile);
    writeState(this.tokenFile, {
      ...stored,
      tokens: {
        ...tokens,
        obtained_at: Date.now(),
      },
      createdAt: stored.createdAt || Date.now(),
    });
    pendingAuths.delete(this.serverName);
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    cleanupPendingAuths();

    const authUrl = authorizationUrl.toString();
    const existingPendingAuth = pendingAuths.get(this.serverName);
    if (existingPendingAuth?.authUrl === authUrl) {
      return;
    }

    const stored = readState(this.tokenFile);
    writeState(this.tokenFile, {
      ...stored,
      authUrl,
      createdAt: Date.now(),
    });

    pendingAuths.set(this.serverName, {
      serverName: this.serverName,
      authUrl,
      redirectUrl: this.redirectUrl,
      tokenFile: this.tokenFile,
      createdAt: Date.now(),
    });

    console.log(`OAuth login required for MCP server '${this.serverName}'. Open: ${authUrl}`);
    await openBrowser(authUrl);
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    const stored = readState(this.tokenFile);
    writeState(this.tokenFile, {
      ...stored,
      codeVerifier,
      state: this.currentState || stored.state,
      createdAt: Date.now(),
    });
  }

  async codeVerifier(): Promise<string> {
    const codeVerifier = readState(this.tokenFile).codeVerifier;
    if (!codeVerifier) {
      throw new Error(`Missing OAuth PKCE code verifier for server: ${this.serverName}`);
    }
    return codeVerifier;
  }

  async invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier'): Promise<void> {
    removeStateParts(this.tokenFile, scope);
  }
}

export const createRemoteOAuthProvider = (
  serverName: string,
  serverConfig: ServerConfig,
): OAuthClientProvider | undefined => {
  if (serverConfig.auth?.type !== 'oauth') {
    return undefined;
  }

  return new RemoteMcpOAuthProvider(serverName, serverConfig);
};

export const getPendingRemoteOAuthAuths = (): PendingOAuthAuth[] => {
  cleanupPendingAuths();

  return Array.from(pendingAuths.values()).map(({ createdAt: _createdAt, ...pendingAuth }) => pendingAuth);
};

export const completeRemoteOAuthLogin = async (serverName: string, code: string, state?: string): Promise<void> => {
  const mcpServerService = getMcpServerService();
  const server = await mcpServerService.getServerByName(serverName);
  if (!server) {
    throw new Error(`MCP server not found: ${serverName}`);
  }

  const serverConfig = mcpServerService.entityToConfig(server);
  if (serverConfig.auth?.type !== 'oauth') {
    throw new Error(`MCP server is not configured for OAuth: ${serverName}`);
  }

  const tokenFile = resolveTokenFile(serverName, serverConfig);
  const stored = readState(tokenFile);
  if (stored.state && state && stored.state !== state) {
    throw new Error('Invalid OAuth state');
  }

  const provider = new RemoteMcpOAuthProvider(serverName, serverConfig);
  await auth(provider, {
    serverUrl: serverConfig.url || '',
    authorizationCode: code,
    scope: serverConfig.auth?.scopes || 'openid profile email offline_access',
  });

  pendingAuths.delete(serverName);
  const { notifyToolChanged } = await import('./mcpService.js');
  await notifyToolChanged(serverName);
};