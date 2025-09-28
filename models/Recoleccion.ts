export interface Recoleccion {
  id: number;
  id_medicamento: number;
  id_usuario: number;
  id_sede: number;
  NoRecoleccion: string;
  fechaRecoleccion: string;
  horaRecoleccion: string;
  horaVencimiento: string;
  cantidad: number;
  cumplimiento: number; 
  medicamento: any | null;
  usuario: any | null;
   sede?: { 
    id: number;
    nombreSede: string;
    ubicacion: string;
  };
}

export interface RecoleccionAgrupada {
  NoRecoleccion: string;
  fechaRecoleccion: string;
  horaRecoleccion: string;
  horaVencimiento: string;
  cumplimiento: number;
  sede: {
    id: number;
    nombreSede: string;
    ubicacion: string;
  };
  medicamentos: {
    id: number;
    nombre: string;
    cantidad: number;
  }[];
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