import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConfig } from '../config/apiBase';

const API_BASE_URL = `${getConfig().API_BASE_URL}/api`; 

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para agregar el token a las solicitudes
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido, cerrar sesión
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    }
    return Promise.reject(error);
  }
);

export default api;