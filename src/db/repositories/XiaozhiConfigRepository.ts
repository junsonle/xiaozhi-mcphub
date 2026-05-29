import { XiaozhiConfig } from '../entities/index.js';
import jsonStorage from '../jsonStorage.js';

export class XiaozhiConfigRepository {
  async getConfig(): Promise<XiaozhiConfig> {
    const db = jsonStorage.data();

    if (!db.xiaozhiConfig) {
      db.xiaozhiConfig = {
        id: 'default',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as XiaozhiConfig;
      jsonStorage.persist();
    }

    return db.xiaozhiConfig;
  }

  async saveConfig(config: Partial<XiaozhiConfig>): Promise<XiaozhiConfig> {
    const db = jsonStorage.data();
    const existing = db.xiaozhiConfig || ({} as XiaozhiConfig);
    const isNew = !db.xiaozhiConfig;

    db.xiaozhiConfig = {
      ...existing,
      ...config,
      id: 'default',
      enabled: config.enabled ?? existing.enabled ?? true,
      loadBalancing: config.loadBalancing ?? existing.loadBalancing,
      createdAt: existing.createdAt || new Date(),
      updatedAt: new Date(),
    } as XiaozhiConfig;

    jsonStorage.timestamps(db.xiaozhiConfig, isNew);
    jsonStorage.persist();
    return db.xiaozhiConfig;
  }
}

let xiaozhiConfigRepoInstance: XiaozhiConfigRepository | null = null;

export function getXiaozhiConfigRepository(): XiaozhiConfigRepository {
  if (!xiaozhiConfigRepoInstance) {
    xiaozhiConfigRepoInstance = new XiaozhiConfigRepository();
  }
  return xiaozhiConfigRepoInstance;
}

export default XiaozhiConfigRepository;
