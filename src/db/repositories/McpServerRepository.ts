import { BaseRepository } from './BaseRepository.js';
import { McpServer } from '../entities/index.js';

export class McpServerRepository extends BaseRepository<McpServer> {
  constructor() {
    super('mcpServers');
  }

  async findByName(name: string): Promise<McpServer | null> {
    return this.getCollection().find((server) => server.name === name) || null;
  }

  async findByOwner(owner: string): Promise<McpServer[]> {
    return this.getCollection().filter((server) => server.owner === owner);
  }

  async findEnabled(): Promise<McpServer[]> {
    return this.getCollection().filter((server) => server.enabled === true);
  }

  async updateEnabledStatus(name: string, enabled: boolean): Promise<boolean> {
    return this.updateConfig(name, { enabled });
  }

  async deleteByName(name: string): Promise<boolean> {
    const collection = this.getCollection();
    const index = collection.findIndex((server) => server.name === name);
    if (index === -1) return false;

    collection.splice(index, 1);
    this.persist();
    return true;
  }

  async exists(name: string): Promise<boolean> {
    return this.getCollection().some((server) => server.name === name);
  }

  async updateConfig(name: string, config: Partial<McpServer>): Promise<boolean> {
    const collection = this.getCollection();
    const index = collection.findIndex((server) => server.name === name);
    if (index === -1) return false;

    collection[index] = {
      ...collection[index],
      ...config,
      name,
      updatedAt: new Date(),
    };
    this.persist();
    return true;
  }

  async getAllServerNames(): Promise<string[]> {
    return this.getCollection().map((server) => server.name);
  }

  async save(entity: Partial<McpServer>): Promise<McpServer> {
    if (!entity.name) {
      throw new Error('MCP server name is required');
    }

    const collection = this.getCollection();
    const index = collection.findIndex((server) => server.name === entity.name);
    const isNew = index === -1;
    const nextEntity = {
      ...(isNew ? {} : collection[index]),
      ...entity,
      enabled: entity.enabled !== false,
      owner: entity.owner || 'admin',
    } as McpServer;

    if (isNew && !nextEntity.createdAt) nextEntity.createdAt = new Date();
    nextEntity.updatedAt = new Date();

    if (isNew) {
      collection.push(nextEntity);
    } else {
      collection[index] = nextEntity;
    }

    this.persist();
    return nextEntity;
  }

  async upsertMany(servers: Partial<McpServer>[]): Promise<McpServer[]> {
    const results: McpServer[] = [];

    for (const serverConfig of servers) {
      if (!serverConfig.name) continue;
      results.push(await this.save(serverConfig));
    }

    return results;
  }
}

let mcpServerRepositoryInstance: McpServerRepository | null = null;

export function getMcpServerRepository(): McpServerRepository {
  if (!mcpServerRepositoryInstance) {
    mcpServerRepositoryInstance = new McpServerRepository();
  }
  return mcpServerRepositoryInstance;
}

export default McpServerRepository;