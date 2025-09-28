from config.connection import db
from models.dispModel import Disponibilidad
from models.favModel import Favoritos
from models.userModel import User
from models.medModel import Medicamentos
from models.sedeModel import Sede
from services.whatsappService import whatsapp_service
from sqlalchemy.exc import SQLAlchemyError
import re

class NotificationService:
    
    @staticmethod
    def notify_favoritos_for_disponibilidad(disponibilidad):
        """
        Notifica a usuarios que tienen este medicamento en favoritos
        cuando el stock pasa de 0 a >0 en una sede específica
        """
        try:
            print(f"Procesando notificación para disponibilidad ID: {disponibilidad.id}")
            print(f"Medicamento: {disponibilidad.id_medicamento}, Sede: {disponibilidad.id_sede}")
            
            # Obtener usuarios que tienen este medicamento específico en favoritos
            favoritos = Favoritos.query.filter_by(
                id_medicamento=disponibilidad.id_medicamento
            ).all()
            
            print(f"   Encontrados {len(favoritos)} favoritos para este medicamento")
            
            if not favoritos:
                print("No hay usuarios con este medicamento en favoritos")
                return False
            
            # Obtener información del medicamento y sede
            medicamento = Medicamentos.query.get(disponibilidad.id_medicamento)
            sede = Sede.query.get(disponibilidad.id_sede)
            
            if not medicamento:
                print(f"Medicamento con ID {disponibilidad.id_medicamento} no encontrado")
                return False
            
            if not sede:
                print(f"Sede con ID {disponibilidad.id_sede} no encontrado")
                return False
            
            print(f"Medicamento: {medicamento.nombreMedicamento}")
            print(f"Sede: {sede.nombreSede}")
            print(f"Stock actual: {disponibilidad.stock}")
            
            notificaciones_enviadas = 0
            
            for favorito in favoritos:
                try:
                    usuario = User.query.get(favorito.id_usuario)
                    if usuario and usuario.telefono:
                        # Formatear número de teléfono para WhatsApp (remover el +)
                        telefono = NotificationService.formatear_telefono_whatsapp(usuario.telefono)
                        
                        if telefono:
                            print(f"  Enviando a: {usuario.nombre} {usuario.apellidos} ({telefono})")
                            
                            # Enviar notificación por WhatsApp
                            exito = whatsapp_service.send_medifast_notification(
                                to_number=telefono,
                                nombre_paciente=f"{usuario.nombre} {usuario.apellidos}",
                                nombre_medicamento=medicamento.nombreMedicamento,
                                sede=sede.nombreSede,
                                stock_actual=disponibilidad.stock
                            )
                            
                            if exito:
                                notificaciones_enviadas += 1
                                print(f"Notificación EXITOSA para {usuario.nombre}")
                            else:
                                print(f"Error enviando notificación a {usuario.telefono}")
                        else:
                            print(f"Teléfono no válido para usuario {usuario.id}: {usuario.telefono}")
                    else:
                        if usuario:
                            print(f"Usuario {usuario.id} no tiene teléfono registrado")
                        else:
                            print(f"Usuario con ID {favorito.id_usuario} no encontrado")
                    
                except Exception as e:
                    print(f"Error notificando usuario {favorito.id_usuario}: {str(e)}")
                    continue
            
            if notificaciones_enviadas > 0:
                print(f"Notificaciones enviadas: {notificaciones_enviadas} usuarios")
            else:
                print("No se enviaron notificaciones")
            
            return notificaciones_enviadas > 0
            
        except Exception as e:
            print(f"Error en notify_favoritos_for_disponibilidad: {str(e)}")
            return False
    
    @staticmethod
    def formatear_telefono_whatsapp(telefono):
        """
        Formatea el número de teléfono para WhatsApp API (sin +)
        """
        try:
            if not telefono:
                return None
            
            # Convertir a string y remover espacios
            telefono_str = str(telefono).strip()
            
            # Remover todos los caracteres no numéricos incluyendo el +
            telefono_limpio = re.sub(r'[^\d]', '', telefono_str)
            
            # Verificar que tenga longitud válida
            if len(telefono_limpio) < 10:
                print(f"Teléfono demasiado corto: {telefono_limpio}")
                return None
            
            # WhatsApp API requiere el número sin el símbolo +
            # Ejemplo: +573222514185 → 573222514185
            return telefono_limpio
            
        except Exception as e:
            print(f"Error formateando teléfono {telefono}: {str(e)}")
            return None
    
    @staticmethod
    def verificar_y_notificar_cambio_stock(disponibilidad_id, stock_anterior, stock_nuevo):
        """
        Verifica específicamente cuando el stock cambia de 0 a >0
        """
        try:
            print(f"Verificando cambio de stock para disponibilidad {disponibilidad_id}")
            print(f"Stock anterior: {stock_anterior}, Stock nuevo: {stock_nuevo}")
            
            # CONDICIÓN CRÍTICA: Solo notificar cuando cambia de 0 a >0
            if stock_anterior == 0 and stock_nuevo > 0:
                disponibilidad = Disponibilidad.query.get(disponibilidad_id)
                if disponibilidad:
                    print(f"Stock cambió de 0 a {stock_nuevo} - ENVIANDO NOTIFICACIÓN")
                    return NotificationService.notify_favoritos_for_disponibilidad(disponibilidad)
                else:
                    print(f"Disponibilidad {disponibilidad_id} no encontrada")
            else:
                if stock_anterior == 0 and stock_nuevo == 0:
                    print("Stock sigue en 0 - No notificar")
                elif stock_anterior > 0 and stock_nuevo > 0:
                    print("Stock sigue siendo > 0 - No notificar")
                elif stock_anterior > 0 and stock_nuevo == 0:
                    print("Stock bajó a 0 - No notificar (solo notificamos de 0 a >0)")
                else:
                    print(f"Cambio no aplica: {stock_anterior} → {stock_nuevo}")
            
            return False
            
        except Exception as e:
            print(f"❌ Error en verificar_y_notificar_cambio_stock: {str(e)}")
            return False
    
    @staticmethod
    def ejecutar_notificaciones_manual():
        """
        Ejecuta notificaciones manualmente para TODAS las disponibilidades con stock > 0
        (Útil para testing o para notificar por primera vez)
        """
        try:
            print("Ejecutando notificaciones manualmente...")
            
            # Obtener todas las disponibilidades con stock > 0
            disponibilidades = Disponibilidad.query.filter(
                Disponibilidad.stock > 0
            ).all()
            
            print(f"Encontradas {len(disponibilidades)} disponibilidades con stock > 0")
            
            notificaciones_totales = 0
            
            for disponibilidad in disponibilidades:
                print(f"\n--- Procesando disponibilidad ID: {disponibilidad.id} ---")
                
                # Para notificación manual, asumimos que stock anterior era 0
                notificadas = NotificationService.verificar_y_notificar_cambio_stock(
                    disponibilidad.id, 0, disponibilidad.stock
                )
                
                if notificadas:
                    notificaciones_totales += 1
            
            print(f"\nProceso manual completado. Notificaciones enviadas: {notificaciones_totales}")
            return notificaciones_totales
            
        except Exception as e:
            print(f"Error en ejecutar_notificaciones_manual: {str(e)}")
            return 0