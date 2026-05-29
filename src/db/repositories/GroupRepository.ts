import { BaseRepository } from './BaseRepository.js';
import { Group } from '../entities/index.js';
import { IGroupServerConfig } from '../../types/index.js';

export class GroupRepository extends BaseRepository<Group> {
  constructor() {
    super('groups');
  }

  async findByName(name: string): Promise<Group | null> {
    return this.getCollection().find((group) => group.name === name) || null;
  }

  async findByIdOrName(key: string): Promise<Group | null> {
    return this.getCollection().find((group) => group.id === key || group.name === key) || null;
  }

  async create(data: {
    name: string;
    description?: string;
    servers?: IGroupServerConfig[];
    owner?: string;
  }): Promise<Group> {
    return await this.save({
      name: data.name,
      description: data.description,
      servers: data.servers || [],
      owner: data.owner || 'admin',
    } as Partial<Group>);
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      servers?: IGroupServerConfig[];
      owner?: string;
    },
  ): Promise<Group | null> {
    const collection = this.getCollection();
    const index = collection.findIndex((group) => group.id === id);
    if (index === -1) return null;

    collection[index] = {
      ...collection[index],
      ...data,
      updatedAt: new Date(),
    };
    this.persist();
    return collection[index];
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    return this.getCollection().some(
      (group) => group.name === name && (!excludeId || group.id !== excludeId),
    );
  }

  async updateServers(id: string, servers: IGroupServerConfig[]): Promise<Group | null> {
    return await this.update(id, { servers });
  }
}

let groupRepositoryInstance: GroupRepository | null = null;

export function getGroupRepository(): GroupRepository {
  if (!groupRepositoryInstance) {
    groupRepositoryInstance = new GroupRepository();
  }
  return groupRepositoryInstance;
}

export default GroupRepository;