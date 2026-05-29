import { SystemConfig } from '../entities/index.js';
import jsonStorage from '../jsonStorage.js';

export class SystemConfigRepository {
  async getConfig(): Promise<SystemConfig | null> {
    return jsonStorage.data().systemConfig;
  }

  async saveConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
    const db = jsonStorage.data();
    const existing = db.systemConfig || ({} as SystemConfig);
    const isNew = !db.systemConfig;

    db.systemConfig = {
      ...existing,
      ...config,
      id: 'default',
      createdAt: existing.createdAt || new Date(),
      updatedAt: new Date(),
    } as SystemConfig;

    jsonStorage.timestamps(db.systemConfig, isNew);
    jsonStorage.persist();
    return db.systemConfig;
  }

  async updateRouting(routing: Partial<SystemConfig['routing']>): Promise<SystemConfig | null> {
    const config = await this.getConfig();
    return await this.saveConfig({ routing: { ...(config?.routing || {}), ...routing } });
  }

  async updateInstall(install: Partial<SystemConfig['install']>): Promise<SystemConfig | null> {
    const config = await this.getConfig();
    return await this.saveConfig({ install: { ...(config?.install || {}), ...install } });
  }

  async updateSmartRouting(
    smartRouting: Partial<SystemConfig['smartRouting']>,
  ): Promise<SystemConfig | null> {
    const config = await this.getConfig();
    return await this.saveConfig({
      smartRouting: { ...(config?.smartRouting || {}), ...smartRouting },
    });
  }

  async updateMcpRouter(mcpRouter: Partial<SystemConfig['mcpRouter']>): Promise<SystemConfig | null> {
    const config = await this.getConfig();
    return await this.saveConfig({ mcpRouter: { ...(config?.mcpRouter || {}), ...mcpRouter } });
  }

  async updateModelScope(modelscope: Partial<SystemConfig['modelscope']>): Promise<SystemConfig | null> {
    const config = await this.getConfig();
    return await this.saveConfig({ modelscope: { ...(config?.modelscope || {}), ...modelscope } });
  }

  async initializeDefaults(): Promise<SystemConfig> {
    const existing = await this.getConfig();
    if (existing) return existing;

    return await this.saveConfig({
      id: 'default',
      routing: {
        enableGlobalRoute: true,
        enableGroupNameRoute: true,
        enableBearerAuth: false,
        bearerAuthKey: '',
        skipAuth: true,
      },
      install: {
        pythonIndexUrl: '',
        npmRegistry: '',
        baseUrl: 'http://localhost:3000',
      },
      smartRouting: {
        enabled: false,
        dbUrl: '',
        apiUrl: '',
        apiKey: '',
        model: '',
        openaiApiBaseUrl: '',
        openaiApiKey: '',
        openaiApiEmbeddingModel: '',
      },
      mcpRouter: {
        apiKey: '',
        referer: 'https://www.mcphubx.com',
        title: 'MCPHub',
        baseUrl: 'https://api.mcprouter.to/v1',
      },
      modelscope: {
        apiKey: '',
      },
    });
  }
}

let systemConfigRepositoryInstance: SystemConfigRepository | null = null;

export function getSystemConfigRepository(): SystemConfigRepository {
  if (!systemConfigRepositoryInstance) {
    systemConfigRepositoryInstance = new SystemConfigRepository();
  }
  return systemConfigRepositoryInstance;
}

export default SystemConfigRepository;