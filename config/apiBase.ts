// ARCHIVO MODO DEV 
export interface AppConfig {
  API_BASE_URL: string;
}

const config: AppConfig = {
  API_BASE_URL: 'https://homoeomorphic-sottedly-jane.ngrok-free.dev/' //API Medifast para el consumo en front
};

export const getConfig = (): AppConfig => {
  return { ...config }; 
};

export default config;