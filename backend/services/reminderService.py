from datetime import datetime, timedelta
from config.connection import db
from models.recoleccionModel import Recoleccion
from models.userModel import User
from services.whatsappService import whatsapp_service
from sqlalchemy.exc import SQLAlchemyError
import threading
import time
from apscheduler.schedulers.background import BackgroundScheduler

class ReminderService:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.app = None  # Referencia a la aplicación Flask
        
    def init_app(self, app):
        """Inicializar con la aplicación Flask"""
        self.app = app
        
    def check_pending_reminders(self):
        """
        Verifica recolecciones que necesitan recordatorio (1 hora antes)
        """
        if not self.app:
            print("Error: Aplicación Flask no inicializada")
            return 0
            
        try:
            # Usar el contexto de la aplicación Flask explícitamente
            with self.app.app_context():
                ahora = datetime.now()
                print(f"Buscando recordatorios pendientes - {ahora}")
                
                # Calcular la ventana de tiempo: recolecciones que ocurren en exactamente 1 hora
                tiempo_objetivo = ahora + timedelta(hours=1)
                fecha_objetivo = tiempo_objetivo.date()
                hora_objetivo = tiempo_objetivo.time()
                
                # Margen de 5 minutos para flexibilidad
                margen = timedelta(minutes=5)
                hora_inicio = (tiempo_objetivo - margen).time()
                hora_fin = (tiempo_objetivo + margen).time()
                
                print(f"Buscando recolecciones para: {fecha_objetivo} entre {hora_inicio} y {hora_fin}")
                
                # Buscar recolecciones PROGRAMADAS (cumplimiento=0) que NO hayan sido notificadas (notificado=0)
                recolecciones = Recoleccion.query.filter(
                    Recoleccion.fechaRecoleccion == fecha_objetivo,
                    Recoleccion.horaRecoleccion.between(hora_inicio, hora_fin),
                    Recoleccion.cumplimiento == 0,  # Solo recolecciones programadas
                    Recoleccion.notificado == 0     # Que no hayan sido notificadas
                ).all()
                
                print(f"Encontradas {len(recolecciones)} recolecciones para recordatorio")
                
                recordatorios_enviados_ahora = 0
                
                for recoleccion in recolecciones:
                    exito = self.send_reminder_for_recoleccion(recoleccion)
                    if exito:
                        # Marcar como notificado en la base de datos
                        recoleccion.notificado = 1
                        db.session.commit()
                        recordatorios_enviados_ahora += 1
                        print(f"Recordatorio marcado como notificado en BD para recolección {recoleccion.NoRecoleccion}")
                    
                print(f"Recordatorios enviados en esta ejecución: {recordatorios_enviados_ahora}")
                return recordatorios_enviados_ahora
                
        except Exception as e:
            print(f"Error en check_pending_reminders: {str(e)}")
            # Hacer rollback dentro del contexto de aplicación
            try:
                with self.app.app_context():
                    db.session.rollback()
            except:
                pass  # Si no hay contexto, ignorar el rollback
            return 0
    
    def send_reminder_for_recoleccion(self, recoleccion):
        """
        Envía recordatorio para una recolección específica
        """
        try:
            # Obtener información del usuario
            usuario = User.query.get(recoleccion.id_usuario)
            if not usuario or not usuario.telefono:
                print(f"Usuario {recoleccion.id_usuario} no encontrado o sin teléfono")
                return False
            
            # Formatear teléfono
            from services.notificationService import NotificationService
            telefono = NotificationService.formatear_telefono_whatsapp(usuario.telefono)
            if not telefono:
                print(f"Teléfono no válido para usuario {usuario.id}")
                return False
            
            # Obtener todos los medicamentos de esta recolección (por si es batch)
            if recoleccion.NoRecoleccion:
                # Es una recolección batch, obtener todos los medicamentos
                recolecciones_batch = Recoleccion.query.filter_by(
                    NoRecoleccion=recoleccion.NoRecoleccion
                ).all()
                
                medicamentos = []
                for rec in recolecciones_batch:
                    if rec.medicamento:
                        medicamentos.append(rec.medicamento.nombreMedicamento)
            else:
                # Recolección individual
                medicamentos = [recoleccion.medicamento.nombreMedicamento] if recoleccion.medicamento else ["Medicamento no especificado"]
            
            # Formatear fecha y hora
            fecha_str = recoleccion.fechaRecoleccion.strftime("%d/%m/%Y")
            hora_str = recoleccion.horaRecoleccion.strftime("%I:%M %p")
            
            # Enviar recordatorio por WhatsApp
            exito = whatsapp_service.send_recoleccion_reminder(
                to_number=telefono,
                nombre_paciente=f"{usuario.nombre} {usuario.apellidos}",
                no_recoleccion=recoleccion.NoRecoleccion,
                fecha_recoleccion=fecha_str,
                hora_recoleccion=hora_str,
                sede=recoleccion.sede.nombreSede if recoleccion.sede else "Sede no especificada",
                medicamentos=medicamentos
            )
            
            if exito:
                print(f"Recordatorio enviado a {usuario.nombre} para recolección {recoleccion.NoRecoleccion}")
                print(f"Fecha: {fecha_str} Hora: {hora_str}")
                return True
            else:
                print(f"Error enviando recordatorio a {usuario.nombre}")
                return False
            
        except Exception as e:
            print(f"Error en send_reminder_for_recoleccion: {str(e)}")
            return False
    
    def start_daily_reminders(self):
        """
        Inicia el scheduler para verificar recordatorios cada 30 minutos
        """
        if not self.app:
            print("Error: Aplicación Flask no inicializada")
            return
            
        try:
            # Iniciar el scheduler solo si no está ya corriendo
            if not self.scheduler.running:
                self.scheduler.start()
            
            # Verificar recordatorios cada 30 minutos para mayor precisión
            self.scheduler.add_job(
                self.check_pending_reminders,
                'interval',
                minutes=30,
                id='reminder_check'
            )
            print("Scheduler de recordatorios iniciado (ejecución cada 30 minutos)")
            print("Los recordatorios se enviarán UNA SOLA VEZ 1 hora antes de cada recolección")
        except Exception as e:
            print(f"Error iniciando scheduler: {str(e)}")
    
    def stop_reminders(self):
        """
        Detiene el scheduler de recordatorios
        """
        try:
            if self.scheduler.running:
                self.scheduler.shutdown()
            print("Scheduler de recordatorios detenido")
        except Exception as e:
            print(f"Error deteniendo scheduler: {str(e)}")

# Instancia global del servicio
reminder_service = ReminderService()