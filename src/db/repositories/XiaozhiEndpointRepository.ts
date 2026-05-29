import BaseRepository from './BaseRepository.js';
import { XiaozhiEndpoint } from '../entities/index.js';

export class XiaozhiEndpointRepository extends BaseRepository<XiaozhiEndpoint> {
  constructor() {
    super('xiaozhiEndpoints');
  }

  async findEnabled(): Promise<XiaozhiEndpoint[]> {
    return this.getCollection().filter((endpoint) => endpoint.enabled);
  }

  async updateStatus(
    id: string,
    status: 'connected' | 'disconnected' | 'connecting',
    lastConnected?: Date,
  ): Promise<void> {
    const collection = this.getCollection();
    const index = collection.findIndex((endpoint) => endpoint.id === id);
    if (index === -1) return;

    collection[index] = {
      ...collection[index],
      status,
      lastConnected: status === 'connected' ? lastConnected || new Date() : collection[index].lastConnected,
      updatedAt: new Date(),
    };
    this.persist();
  }

  async updateById(id: string, data: Partial<XiaozhiEndpoint>): Promise<XiaozhiEndpoint | null> {
    const collection = this.getCollection();
    const index = collection.findIndex((endpoint) => endpoint.id === id);
    if (index === -1) return null;

    collection[index] = {
      ...collection[index],
      ...data,
      id,
      updatedAt: new Date(),
    };
    this.persist();
    return collection[index];
  }
}

let endpointRepoInstance: XiaozhiEndpointRepository | null = null;

export function getXiaozhiEndpointRepository(): XiaozhiEndpointRepository {
  if (!endpointRepoInstance) {
    endpointRepoInstance = new XiaozhiEndpointRepository();
  }
  return endpointRepoInstance;
}

export default XiaozhiEndpointRepository;
