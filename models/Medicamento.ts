export interface Medicamento {
  id: number;
  nombreMedicamento: string;
  tipo: string;
  referencia: string;
  descripcion: string;
  foto: string | null;
  nombre_archivo: string | null;
  tipo_mime: string | null;
}

export interface Disponibilidad {
  id: number;
  id_medicamento: number;
  id_sede: number;
  stock: number;
  estado: string;
  medicamento: Medicamento | null;
  sede: any | null; 
}