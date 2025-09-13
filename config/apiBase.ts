// ARCHIVO MODO DEV 
export interface AppConfig {
  API_BASE_URL: string;
}

const config: AppConfig = {
  API_BASE_URL: 'http://192.168.1.51:5000' //   IP DE LA API DEL BACKEND
};

export const getConfig = (): AppConfig => {
  return { ...config }; 
};

export default config;