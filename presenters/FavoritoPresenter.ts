import api from '../services/api';
import { Favorito } from '../models/Favorito';

export class FavoritoPresenter {
  static async agregarFavorito(idMedicamento: number): Promise<Favorito> {
    try {
      const response = await api.post('/favoritos', {
        id_medicamento: idMedicamento
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al agregar a favoritos');
    }
  }

  static async eliminarFavorito(idMedicamento: number): Promise<void> {
    try {
      await api.delete(`/favoritos/${idMedicamento}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al eliminar de favoritos');
    }
  }

  static async obtenerFavoritosUsuario(): Promise<Favorito[]> {
    try {
      const response = await api.get('/favoritos/usuario');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener favoritos');
    }
  }

  static async verificarFavorito(idMedicamento: number): Promise<boolean> {
    try {
      const response = await api.get(`/favoritos/${idMedicamento}`);
      return response.data.es_favorito;
    } catch (error: any) {
      console.log('Error al verificar favorito:', error);
      return false;
    }
  }
}