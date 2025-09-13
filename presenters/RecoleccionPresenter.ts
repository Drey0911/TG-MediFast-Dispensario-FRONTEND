import api from '../services/api';
import { Recoleccion, RecoleccionCreate } from '../models/Recoleccion';

export class RecoleccionPresenter {
  static async getAllRecolecciones(): Promise<Recoleccion[]> {
    try {
      const response = await api.get('/recolecciones');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener recolecciones');
    }
  }

  // Método para crear recolecciones en batch
  static async createRecoleccionBatch(data: RecoleccionCreate[]): Promise<Recoleccion[]> {
    try {
      const response = await api.post('/recolecciones/batch', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al crear recolecciones');
    }
  }

  static async getRecoleccionesByUsuario(userId: number): Promise<Recoleccion[]> {
    try {
      const response = await api.get(`/recolecciones/usuario/${userId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener recolecciones del usuario');
    }
  }

  static async getRecoleccionById(id: number): Promise<Recoleccion> {
    try {
      const response = await api.get(`/recolecciones/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener recolección');
    }
  }

  static async createRecoleccion(data: RecoleccionCreate): Promise<Recoleccion> {
    try {
      const response = await api.post('/recolecciones', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al crear recolección');
    }
  }

  static async updateRecoleccion(id: number, data: Partial<Recoleccion>): Promise<Recoleccion> {
    try {
      const response = await api.put(`/recolecciones/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al actualizar recolección');
    }
  }

  static async deleteRecoleccion(id: number): Promise<void> {
    try {
      await api.delete(`/recolecciones/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al eliminar recolección');
    }
  }

  static async getRecoleccionesByEstado(estado: number): Promise<Recoleccion[]> {
    try {
      const response = await api.get(`/recolecciones/estado/${estado}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener recolecciones por estado');
    }
  }
}