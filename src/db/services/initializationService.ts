import { getUserRepository } from '../repositories/UserRepository.js';
import { getMcpServerRepository } from '../repositories/McpServerRepository.js';

/**
 * Default MCP servers configuration
 */
const defaultMcpServers = [
  {
    name: 'amap',
    command: 'npx',
    args: ['-y', '@amap/amap-maps-mcp-server'],
    env: {
      AMAP_MAPS_API_KEY: 'your-api-key',
    },
    enabled: true,
  },
  {
    name: 'playwright',
    command: 'npx',
    args: ['@playwright/mcp@latest', '--headless'],
    enabled: true,
  },
  {
    name: 'fetch',
    command: 'uvx',
    args: ['mcp-server-fetch'],
    enabled: true,
  },
  {
    name: 'slack',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    env: {
      SLACK_BOT_TOKEN: 'your-bot-token',
      SLACK_TEAM_ID: 'your-team-id',
    },
    enabled: true,
  },
];

/**
 * Default users configuration
 */
const defaultUsers = [
  {
    username: 'admin',
    password: '$2b$10$P/FoYsdJZROBNgkxeyQjlOcEB2x369M/rhkWU0du9fedzj1YoOSKy',
    isAdmin: true,
  },
];

/**
 * Initialize default data in the JSON storage
 */
export async function initializeDefaultData(): Promise<void> {
  try {
    console.log('Initializing default JSON data...');

    const userRepository = getUserRepository();
    const mcpServerRepository = getMcpServerRepository();

    const existingUsers = await userRepository.count();
    const existingServers = await mcpServerRepository.count();

    if (existingUsers === 0) {
      console.log('Creating default users...');
      for (const userData of defaultUsers) {
        await userRepository.create(userData as any);
      }
      console.log(`Created ${defaultUsers.length} default users`);
    } else {
      console.log(`Users already exist (${existingUsers} found), skipping user initialization`);
    }

    if (existingServers === 0) {
      console.log('Creating default MCP servers...');
      for (const serverData of defaultMcpServers) {
        await mcpServerRepository.save(serverData as any);
      }
      console.log(`Created ${defaultMcpServers.length} default MCP servers`);
    } else {
      console.log(
        `MCP servers already exist (${existingServers} found), skipping server initialization`,
      );
    }

    const { getSystemConfigService } = await import('../../services/systemConfigService.js');
    const systemConfigService = getSystemConfigService();
    await systemConfigService.initialize();
    console.log('System configuration initialized');

    console.log('Default data initialization completed');
  } catch (error) {
    console.error('Error initializing default data:', error);
    throw error;
  }
}

/**
 * Check if default data needs to be initialized
 */
export async function needsInitialization(): Promise<boolean> {
  try {
    const userRepository = getUserRepository();
    const mcpServerRepository = getMcpServerRepository();

    const userCount = await userRepository.count();
    const serverCount = await mcpServerRepository.count();

    return userCount === 0 || serverCount === 0;
  } catch (error) {
    console.error('Error checking initialization status:', error);
    return true;
  }
}

/**
 * Get default admin user credentials
 */
export function getDefaultAdminCredentials() {
  return {
    username: 'admin',
    password: 'admin123',
    note: 'This is the default admin password. Please change it after first login.',
  };
}

export default initializeDefaultData;