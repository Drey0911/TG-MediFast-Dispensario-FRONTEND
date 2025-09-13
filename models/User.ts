export interface User {
  id: number;
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  rol: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}