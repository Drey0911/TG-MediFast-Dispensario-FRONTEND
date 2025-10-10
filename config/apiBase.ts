// ARCHIVO MODO DEV 
export interface AppConfig {
  API_BASE_URL: string;
}

const config: AppConfig = {
  API_BASE_URL: 'https://medifast.up.railway.app' //API Medifast para el consumo en front
};

export const getConfig = (): AppConfig => {
  return { ...config }; 
};

export default config;