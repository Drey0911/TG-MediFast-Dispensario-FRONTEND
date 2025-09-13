import api from '../services/api';
import { User } from '../models/User';

export class UserPresenter {
  static async getAllUsers(): Promise<User[]> {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener usuarios');
    }
  }

  static async getUserById(id: number): Promise<User> {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener usuario');
    }
  }

  static async updateUser(id: number, data: Partial<User> & { password?: string }): Promise<User> {
    try {
      const response = await api.put(`/users/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al actualizar usuario');
    }
  }

  static async deleteUser(id: number): Promise<void> {
    try {
      await api.delete(`/users/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al eliminar usuario');
    }
  }

  static async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get('/me');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener usuario actual');
    }
  }
}