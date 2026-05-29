import { initializeDefaultData } from './services/initializationService.js';
import { initializeJsonStorage, closeJsonStorage } from './jsonStorage.js';

let initialized = false;
let initializationPromise: Promise<any> | null = null;

export const updateDataSourceConfig = (): any => {
  return {
    type: 'json',
    path: process.env.JSON_DB_PATH || 'data/db.json',
  };
};

export const getAppDataSource = (): any => {
  return {
    isInitialized: initialized,
    options: updateDataSourceConfig(),
  };
};

export const reconnectDatabase = async (): Promise<any> => {
  initialized = false;
  initializationPromise = null;
  return await initializeDatabase();
};

export const initializeDatabase = async (): Promise<any> => {
  if (initializationPromise) {
    return initializationPromise;
  }

  if (initialized) {
    return Promise.resolve(getAppDataSource());
  }

  initializationPromise = (async () => {
    await initializeJsonStorage();
    initialized = true;
    await initializeDefaultData();
    console.log('JSON storage initialized successfully');
    return getAppDataSource();
  })();

  try {
    return await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    initialized = false;
    throw error;
  }
};

export const isDatabaseConnected = (): boolean => {
  return initialized;
};

export const closeDatabase = async (): Promise<void> => {
  await closeJsonStorage();
  initialized = false;
};

export const AppDataSource = getAppDataSource();

export default getAppDataSource;
