import jsonStorage, { JsonDatabase } from '../jsonStorage.js';

type CollectionKey = keyof Pick<
  JsonDatabase,
  'users' | 'mcpServers' | 'groups' | 'xiaozhiEndpoints' | 'vectorEmbeddings'
>;

export class BaseRepository<T extends { id?: string; createdAt?: Date; updatedAt?: Date }> {
  protected readonly collectionKey: CollectionKey;

  constructor(collectionKey: CollectionKey) {
    this.collectionKey = collectionKey;
  }

  protected getCollection(): T[] {
    return jsonStorage.data()[this.collectionKey] as unknown as T[];
  }

  protected persist(): void {
    jsonStorage.persist();
  }

  getRepository(): T[] {
    return this.getCollection();
  }

  async findAll(): Promise<T[]> {
    return [...this.getCollection()];
  }

  async findById(id: string | number): Promise<T | null> {
    return this.getCollection().find((item) => String(item.id) === String(id)) || null;
  }

  async save(entity: Partial<T>): Promise<T> {
    const collection = this.getCollection();
    const existingIndex =
      entity.id !== undefined
        ? collection.findIndex((item) => String(item.id) === String(entity.id))
        : -1;

    const isNew = existingIndex === -1;
    const nextEntity: T = {
      ...(isNew ? {} : collection[existingIndex]),
      ...entity,
    } as T;

    if (isNew && !nextEntity.id) {
      nextEntity.id = jsonStorage.generateId() as T['id'];
    }

    jsonStorage.timestamps(nextEntity, isNew);

    if (isNew) {
      collection.push(nextEntity);
    } else {
      collection[existingIndex] = nextEntity;
    }

    this.persist();
    return nextEntity;
  }

  async saveMany(entities: Partial<T>[]): Promise<T[]> {
    const collection = this.getCollection();
    const results: T[] = [];

    for (const entity of entities) {
      const existingIndex =
        entity.id !== undefined
          ? collection.findIndex((item) => String(item.id) === String(entity.id))
          : -1;

      const isNew = existingIndex === -1;
      const nextEntity: T = {
        ...(isNew ? {} : collection[existingIndex]),
        ...entity,
      } as T;

      if (isNew && !nextEntity.id) {
        nextEntity.id = jsonStorage.generateId() as T['id'];
      }

      jsonStorage.timestamps(nextEntity, isNew);

      if (isNew) {
        collection.push(nextEntity);
      } else {
        collection[existingIndex] = nextEntity;
      }

      results.push(nextEntity);
    }

    this.persist();
    return results;
  }

  async delete(id: string | number): Promise<boolean> {
    const collection = this.getCollection();
    const index = collection.findIndex((item) => String(item.id) === String(id));
    if (index === -1) return false;

    collection.splice(index, 1);
    this.persist();
    return true;
  }

  async count(): Promise<number> {
    return this.getCollection().length;
  }
}

export default BaseRepository;
