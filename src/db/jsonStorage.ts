import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { McpServer, User, Group, SystemConfig, XiaozhiConfig, XiaozhiEndpoint, VectorEmbedding } from './entities/index.js';

export interface JsonDatabase {
  users: User[];
  mcpServers: McpServer[];
  groups: Group[];
  systemConfig: SystemConfig | null;
  xiaozhiConfig: XiaozhiConfig | null;
  xiaozhiEndpoints: XiaozhiEndpoint[];
  vectorEmbeddings: VectorEmbedding[];
}

const dataDir = process.env.JSON_DATA_DIR || path.resolve(process.cwd(), 'data');
const dbPath = process.env.JSON_DB_PATH || path.join(dataDir, 'db.json');

const now = () => new Date();

const defaultData = (): JsonDatabase => ({
  users: [],
  mcpServers: [],
  groups: [],
  systemConfig: null,
  xiaozhiConfig: null,
  xiaozhiEndpoints: [],
  vectorEmbeddings: [],
});

const reviveDates = <T>(value: T): T => {
  if (!value || typeof value !== 'object') return value;

  const walk = (item: any): any => {
    if (Array.isArray(item)) return item.map(walk);
    if (!item || typeof item !== 'object') return item;

    for (const key of Object.keys(item)) {
      if ((key === 'createdAt' || key === 'updatedAt' || key === 'lastConnected') && typeof item[key] === 'string') {
        item[key] = new Date(item[key]);
      } else {
        item[key] = walk(item[key]);
      }
    }
    return item;
  };

  return walk(value);
};

export class JsonStorage {
  private db: JsonDatabase = defaultData();
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(dbPath)) {
      this.db = defaultData();
      this.persist();
    } else {
      const raw = fs.readFileSync(dbPath, 'utf8');
      this.db = reviveDates({
        ...defaultData(),
        ...(raw.trim() ? JSON.parse(raw) : {}),
      });
    }

    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getPath(): string {
    return dbPath;
  }

  data(): JsonDatabase {
    this.initialize();
    return this.db;
  }

  persist(): void {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const json = process.env.JSON_PRETTY === 'true'
      ? JSON.stringify(this.db, null, 2)
      : JSON.stringify(this.db);
    fs.writeFileSync(dbPath, json, 'utf8');
  }

  generateId(): string {
    return crypto.randomUUID();
  }

  timestamps<T extends { createdAt?: Date; updatedAt?: Date }>(entity: T, isNew: boolean): T {
    const timestamp = now();
    if (isNew && !entity.createdAt) entity.createdAt = timestamp;
    entity.updatedAt = timestamp;
    return entity;
  }
}

export const jsonStorage = new JsonStorage();

export const initializeJsonStorage = async (): Promise<JsonStorage> => {
  jsonStorage.initialize();
  return jsonStorage;
};

export const closeJsonStorage = async (): Promise<void> => {
  jsonStorage.persist();
};

export default jsonStorage;