// ARCHIVO MODO DEV 
export interface AppConfig {
  API_BASE_URL: string;
}

const config: AppConfig = {
  API_BASE_URL: 'http://192.168.1.51:8000' //API Medifast para el consumo en front
};

export const getConfig = (): AppConfig => {
  return { ...config }; 
};

export default config;