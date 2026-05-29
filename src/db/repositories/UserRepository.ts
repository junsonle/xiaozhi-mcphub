import { User } from '../entities/index.js';
import BaseRepository from './BaseRepository.js';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async findAll(): Promise<User[]> {
    return [...this.getCollection()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.getCollection().find((user) => user.username === username) || null;
  }

  async create(userData: Partial<User>): Promise<User> {
    return await this.save(userData);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    const collection = this.getCollection();
    const index = collection.findIndex((user) => user.id === id);
    if (index === -1) return null;

    collection[index] = {
      ...collection[index],
      ...userData,
      updatedAt: new Date(),
    };
    this.persist();
    return collection[index];
  }

  async updateByUsername(username: string, userData: Partial<User>): Promise<User | null> {
    const collection = this.getCollection();
    const index = collection.findIndex((user) => user.username === username);
    if (index === -1) return null;

    collection[index] = {
      ...collection[index],
      ...userData,
      username,
      updatedAt: new Date(),
    };
    this.persist();
    return collection[index];
  }

  async deleteByUsername(username: string): Promise<boolean> {
    const collection = this.getCollection();
    const index = collection.findIndex((user) => user.username === username);
    if (index === -1) return false;

    collection.splice(index, 1);
    this.persist();
    return true;
  }

  async countAdmins(): Promise<number> {
    return this.getCollection().filter((user) => user.isAdmin).length;
  }

  async usernameExists(username: string): Promise<boolean> {
    return this.getCollection().some((user) => user.username === username);
  }

  async findAllAdmins(): Promise<User[]> {
    return this.getCollection()
      .filter((user) => user.isAdmin)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async initializeDefaultAdmin(username: string, hashedPassword: string): Promise<User | null> {
    const userCount = await this.count();
    if (userCount === 0) {
      return await this.create({
        username,
        password: hashedPassword,
        isAdmin: true,
      });
    }
    return null;
  }
}

let userRepositoryInstance: UserRepository | null = null;

export function getUserRepository(): UserRepository {
  if (!userRepositoryInstance) {
    userRepositoryInstance = new UserRepository();
  }
  return userRepositoryInstance;
}

export default UserRepository;