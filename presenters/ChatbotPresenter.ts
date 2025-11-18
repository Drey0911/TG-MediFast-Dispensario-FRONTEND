import api from '../services/api';
import { RespuestaChatbot } from '../models/Chatbot';

export class ChatbotPresenter {
  static async enviarMensaje(mensaje: string): Promise<RespuestaChatbot> {
    try {
      const response = await api.post('/chatbot/mensaje', {
        mensaje: mensaje
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al enviar mensaje al chatbot');
    }
  }

  static async getMedicamentosDisponibles(): Promise<any[]> {
    try {
      const response = await api.get('/chatbot/medicamentos-disponibles');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener medicamentos disponibles');
    }
  }
}