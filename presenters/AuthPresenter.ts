import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse } from '../models/User';

export class AuthPresenter {
  static async login(dni: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post('/login', { dni, password });
      const { user, token } = response.data;
      
      // Guardar token y datos del usuario
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return { user, token };
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error en el login, Revisa tu conexion a internet');
    }
  }

  static async register(nombre: string, apellidos: string, dni: string, telefono: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post('/register', { nombre, apellidos, dni, telefono, password });
      const { user, token } = response.data;
      
      // Guardar token y datos del usuario
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return { user, token };
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error en el registro, Revisa tu conexion a internet');
    }
  }

  static async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    } catch (error) {
      throw new Error('Error al cerrar sesión, Revisa tu conexion a internet');
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch (error) {
      return null;
    }
  }
}