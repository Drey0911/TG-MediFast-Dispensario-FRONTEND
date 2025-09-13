export interface Recoleccion {
  id: number;
  id_medicamento: number;
  id_usuario: number;
  NoRecoleccion: string;
  fechaRecoleccion: string;
  horaRecoleccion: string;
  horaVencimiento: string;
  cantidad: number;
  cumplimiento: number; 
  medicamento: any | null;
  usuario: any | null;
}

export interface RecoleccionCreate {
  id_medicamento: number;
  id_usuario: number;
  fechaRecoleccion: string;
  horaRecoleccion: string;
  cantidad: number;
  id_sede?: number;
}

export interface RecoleccionCarrito {
  medicamentoId: number;
  medicamentoNombre: string;
  sedeId: number;
  sedeNombre: string;
  stock: number;
  estado: string;
  fechaRecoleccion: string;
  horaRecoleccion: string;
  cantidad: number;
  maxCantidad: number;
}