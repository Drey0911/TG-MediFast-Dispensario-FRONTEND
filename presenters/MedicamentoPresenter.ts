import api from '../services/api';
import { Medicamento, Disponibilidad } from '../models/Medicamento';

export class MedicamentoPresenter {
  static async getAllMedicamentos(): Promise<Medicamento[]> {
    try {
      const response = await api.get('/medicamentos');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener medicamentos');
    }
  }

  static async getMedicamentoById(id: number): Promise<Medicamento> {
    try {
      const response = await api.get(`/medicamentos/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener medicamento');
    }
  }

  static async getDisponibilidad(): Promise<Disponibilidad[]> {
    try {
      const response = await api.get('/disponibilidad');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener disponibilidad');
    }
  }

  static async getDisponibilidadByMedicamento(medicamentoId: number): Promise<Disponibilidad[]> {
    try {
      const response = await api.get(`/disponibilidad/medicamento/${medicamentoId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener disponibilidad del medicamento');
    }
  }

  static async searchMedicamentos(nombre: string, tipo: string, referencia: string): Promise<Medicamento[]> {
    try {
      const params = new URLSearchParams();
      if (nombre) params.append('nombre', nombre);
      if (tipo) params.append('tipo', tipo);
      if (referencia) params.append('referencia', referencia);
      
      const response = await api.get(`/medicamentos/search?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al buscar medicamentos');
    }
  }
}