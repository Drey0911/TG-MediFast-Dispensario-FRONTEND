export interface MensajeChatbot {
  id: string;
  mensaje: string;
  esUsuario: boolean;
  timestamp: Date;
  medicamentosRelevantes?: MedicamentoRelevante[];
}

export interface MedicamentoRelevante {
  nombre: string;
  tipo: string;
  descripcion: string;
  sede: string;
  stock: number;
  estado: string;
}

export interface RespuestaChatbot {
  respuesta: string;
  medicamentos_relevantes: MedicamentoRelevante[];
  timestamp: string;
}