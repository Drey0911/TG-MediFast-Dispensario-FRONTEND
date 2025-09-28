from models.dispModel import Disponibilidad
from models.recoleccionModel import Recoleccion
from config.connection import db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta, time

class RecoleccionService:
    
    @staticmethod
    def create_recoleccion_batch(recolecciones_data):
        """
        Crea múltiples recolecciones con el mismo NoRecoleccion
        """
        try:
            # Validar que todas las recolecciones tengan la misma fecha, hora y sede
            primera_fecha = recolecciones_data[0]['fechaRecoleccion']
            primera_hora = recolecciones_data[0]['horaRecoleccion']
            primera_sede = recolecciones_data[0]['id_sede']
            
            for rec in recolecciones_data:
                if (rec['fechaRecoleccion'] != primera_fecha or 
                    rec['horaRecoleccion'] != primera_hora or 
                    rec['id_sede'] != primera_sede):
                    return None, "Todas las recolecciones deben tener la misma fecha, hora y sede"
            
            # Validar fecha y hora (deben ser futuras)
            fecha_obj = datetime.strptime(primera_fecha, '%Y-%m-%d').date()
            hora_obj = datetime.strptime(primera_hora, '%H:%M:%S').time()
            
            ahora = datetime.now()
            fecha_hora_recoleccion = datetime.combine(fecha_obj, hora_obj)
            
            if fecha_hora_recoleccion <= ahora:
                return None, "La fecha y hora de recolección deben ser futuras"
            
            # Calcular hora de vencimiento (1 hora después)
            hora_vencimiento = (datetime.combine(datetime.min, hora_obj) + timedelta(hours=1)).time()
            
            # Generar número de recolección único
            no_recoleccion = Recoleccion.generate_no_recoleccion()
            while Recoleccion.query.filter_by(NoRecoleccion=no_recoleccion).first():
                no_recoleccion = Recoleccion.generate_no_recoleccion()
            
            nuevas_recolecciones = []
            
            for rec_data in recolecciones_data:
                # Verificar stock disponible
                disponibilidad = Disponibilidad.query.filter_by(
                    id_medicamento=rec_data['id_medicamento'],
                    id_sede=rec_data['id_sede']
                ).first()
                
                if not disponibilidad:
                    return None, f"No hay disponibilidad para el medicamento {rec_data['id_medicamento']} en la sede {rec_data['id_sede']}"
                
                if disponibilidad.stock < rec_data['cantidad']:
                    return None, f"Stock insuficiente para el medicamento {rec_data['id_medicamento']} en la sede {rec_data['id_sede']}. Stock actual: {disponibilidad.stock}"
                
                # Crear nueva recolección
                nueva_recoleccion = Recoleccion(
                    id_medicamento=rec_data['id_medicamento'],
                    id_usuario=rec_data['id_usuario'],
                    id_sede=rec_data['id_sede'],
                    NoRecoleccion=no_recoleccion,
                    fechaRecoleccion=fecha_obj,
                    horaRecoleccion=hora_obj,
                    horaVencimiento=hora_vencimiento,
                    cantidad=rec_data['cantidad'],
                    cumplimiento=0  # PROGRAMADO
                )
                
                # Actualizar stock
                disponibilidad.stock -= rec_data['cantidad']
                if disponibilidad.stock == 0:
                    disponibilidad.estado = 'agotado'
                elif disponibilidad.stock <= 10:
                    disponibilidad.estado = 'poco_stock'
                else:
                    disponibilidad.estado = 'disponible'
                
                db.session.add(nueva_recoleccion)
                nuevas_recolecciones.append(nueva_recoleccion)
        
            db.session.commit()
            
            # Recargar con relaciones
            recolecciones_completas = []
            for rec in nuevas_recolecciones:
                rec_completa = Recoleccion.query.options(
                    joinedload(Recoleccion.medicamento),
                    joinedload(Recoleccion.usuario),
                    joinedload(Recoleccion.sede)
                ).get(rec.id)
                recolecciones_completas.append(rec_completa.to_dict())
        
            return recolecciones_completas, None
        except ValueError:
            return None, "Formato de fecha u hora inválido"
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Error de base de datos: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return None, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def create_recoleccion(id_medicamento, id_usuario, fecha_recoleccion, hora_recoleccion, cantidad, id_sede):
        """
        Crea una nueva recolección
        """
        try:
            # Validar fecha y hora (deben ser futuras)
            fecha_obj = datetime.strptime(fecha_recoleccion, '%Y-%m-%d').date()
            hora_obj = datetime.strptime(hora_recoleccion, '%H:%M:%S').time()
            
            ahora = datetime.now()
            fecha_hora_recoleccion = datetime.combine(fecha_obj, hora_obj)
            
            if fecha_hora_recoleccion <= ahora:
                return None, "La fecha y hora de recolección deben ser futuras"
            
            # Calcular hora de vencimiento (1 hora después)
            hora_vencimiento = (datetime.combine(datetime.min, hora_obj) + timedelta(hours=1)).time()
            
            # Generar número de recolección único
            no_recoleccion = Recoleccion.generate_no_recoleccion()
            while Recoleccion.query.filter_by(NoRecoleccion=no_recoleccion).first():
                no_recoleccion = Recoleccion.generate_no_recoleccion()
            
            # Verificar stock disponible
            disponibilidad = Disponibilidad.query.filter_by(
                id_medicamento=id_medicamento,
                id_sede=id_sede
            ).first()
            
            if not disponibilidad:
                return None, f"No hay disponibilidad para el medicamento {id_medicamento} en la sede {id_sede}"
            
            if disponibilidad.stock < cantidad:
                return None, f"Stock insuficiente para el medicamento {id_medicamento} en la sede {id_sede}. Stock actual: {disponibilidad.stock}"
            
            # Crear nueva recolección
            nueva_recoleccion = Recoleccion(
                id_medicamento=id_medicamento,
                id_usuario=id_usuario,
                id_sede=id_sede,  # Asignar sede
                NoRecoleccion=no_recoleccion,
                fechaRecoleccion=fecha_obj,
                horaRecoleccion=hora_obj,
                horaVencimiento=hora_vencimiento,
                cantidad=cantidad,
                cumplimiento=0
            )
            
            # Actualizar stock
            disponibilidad.stock -= cantidad
            if disponibilidad.stock == 0:
                disponibilidad.estado = 'agotado'
            elif disponibilidad.stock <= 10:
                disponibilidad.estado = 'poco_stock'
            else:
                disponibilidad.estado = 'disponible'
            
            db.session.add(nueva_recoleccion)
            db.session.commit()
            
            # Recargar con relaciones
            recoleccion_completa = Recoleccion.query.options(
                joinedload(Recoleccion.medicamento),
                joinedload(Recoleccion.usuario),
                joinedload(Recoleccion.medicamento.sede)
            ).get(nueva_recoleccion.id)
            
            return recoleccion_completa.to_dict(), None
        
        except ValueError:
            return None, "Formato de fecha u hora inválido"
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Error de base de datos: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return None, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_all_recolecciones():
        """
        Obtiene todas las recolecciones con sus relaciones
        """
        try:
            recolecciones = Recoleccion.query.options(
                joinedload(Recoleccion.medicamento),
                joinedload(Recoleccion.usuario),
                joinedload(Recoleccion.sede)
            ).all()
            
            return [rec.to_dict() for rec in recolecciones], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_recoleccion_by_id(recoleccion_id):
        """
        Obtiene una recolección por su ID
        """
        try:
            recoleccion = Recoleccion.query.options(
                joinedload(Recoleccion.medicamento),
                joinedload(Recoleccion.usuario),
                joinedload(Recoleccion.sede)
            ).get(recoleccion_id)
            
            if not recoleccion:
                return None, "Recolección no encontrada"
            
            return recoleccion.to_dict(), None
            
        except SQLAlchemyError as e:
            return None, f"Error de base de datos: {str(e)}"
        except Exception as e:
            return None, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_recolecciones_by_usuario(usuario_id):
        """
        Obtiene todas las recolecciones de un usuario específico
        """
        try:
            recolecciones = Recoleccion.query.options(
                joinedload(Recoleccion.medicamento),
                joinedload(Recoleccion.usuario),
                joinedload(Recoleccion.sede)
            ).filter_by(id_usuario=usuario_id).all()
            
            return [rec.to_dict() for rec in recolecciones], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_recolecciones_by_estado(estado):
        """
        Obtiene recolecciones por estado
        """
        try:
            recolecciones = Recoleccion.query.options(
                joinedload(Recoleccion.medicamento),
                joinedload(Recoleccion.usuario),
                joinedload(Recoleccion.sede)
            ).filter_by(cumplimiento=estado).all()
            
            return [rec.to_dict() for rec in recolecciones], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"
    
    @staticmethod
    def update_recoleccion(recoleccion_id, data):
        """
        Actualiza una recolección existente
        """
        try:
            recoleccion = Recoleccion.query.get(recoleccion_id)
            if not recoleccion:
                return None, "Recolección no encontrada"
            
            # Verificar si el estado cambia a cancelado (estado = 3)
            if 'cumplimiento' in data and data['cumplimiento'] == 3 and recoleccion.cumplimiento != 3:
                # Devolver el stock a la disponibilidad
                disponibilidad = Disponibilidad.query.filter_by(
                    id_medicamento=recoleccion.id_medicamento,
                    id_sede=recoleccion.id_sede
                ).first()
                
                if disponibilidad:
                    disponibilidad.stock += recoleccion.cantidad
                    if disponibilidad.stock == 0:
                        disponibilidad.estado = 'agotado'
                    elif disponibilidad.stock <= 10:
                        disponibilidad.estado = 'poco_stock'
                    else:
                        disponibilidad.estado = 'disponible'
            
            # Actualizar los campos de la recolección
            if 'fechaRecoleccion' in data:
                recoleccion.fechaRecoleccion = datetime.strptime(data['fechaRecoleccion'], '%Y-%m-%d').date()
            
            if 'horaRecoleccion' in data:
                recoleccion.horaRecoleccion = datetime.strptime(data['horaRecoleccion'], '%H:%M:%S').time()
                # Recalcular hora de vencimiento
                recoleccion.horaVencimiento = (datetime.combine(datetime.min, recoleccion.horaRecoleccion) + timedelta(hours=1)).time()
            
            if 'cumplimiento' in data:
                recoleccion.cumplimiento = data['cumplimiento']
            
            db.session.commit()
            
            # Recargar con relaciones
            recoleccion_actualizada = Recoleccion.query.options(
                joinedload(Recoleccion.medicamento),
                joinedload(Recoleccion.usuario)
            ).get(recoleccion_id)
            
            return recoleccion_actualizada.to_dict(), None
        except ValueError:
            return None, "Formato de fecha u hora inválido"
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Error de base de datos: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return None, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def delete_recoleccion(recoleccion_id):
        """
        Elimina una recolección
        """
        try:
            recoleccion = Recoleccion.query.get(recoleccion_id)
            if not recoleccion:
                return False, "Recolección no encontrada"
            
            db.session.delete(recoleccion)
            db.session.commit()
            
            return True, None
            
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Error de base de datos: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return False, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def check_vencimientos():
        """
        Verifica y actualiza recolecciones vencidas
        """
        try:
            ahora = datetime.now()
            hora_actual = ahora.time()
            fecha_actual = ahora.date()
            
            # Recolecciones programadas con fecha anterior a hoy o fecha igual pero hora de vencimiento pasada
            recolecciones_vencidas = Recoleccion.query.filter(
                (Recoleccion.cumplimiento == 0) &  # PROGRAMADO
                (
                    (Recoleccion.fechaRecoleccion < fecha_actual) |
                    ((Recoleccion.fechaRecoleccion == fecha_actual) & (Recoleccion.horaVencimiento < hora_actual))
                )
            ).all()
            
            for rec in recolecciones_vencidas:
                rec.cumplimiento = 2  # VENCIDO
            
            db.session.commit()
            
            return len(recolecciones_vencidas), None
            
        except SQLAlchemyError as e:
            db.session.rollback()
            return 0, f"Error de base de datos: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return 0, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_recolecciones_by_norecoleccion(norecoleccion):
        """
        Obtiene todas las recolecciones asociadas a un NoRecoleccion específico.
        """
        try:
            recolecciones = Recoleccion.query.options(
                joinedload(Recoleccion.medicamento),
                joinedload(Recoleccion.usuario)
            ).filter_by(NoRecoleccion=norecoleccion).all()
            
            if not recolecciones:
                return None, "No se encontraron recolecciones con el número proporcionado"
            
            # Agregar información de la sede desde la tabla Disponibilidad
            recolecciones_completas = []
            for rec in recolecciones:
                disponibilidad = Disponibilidad.query.filter_by(
                    id_medicamento=rec.id_medicamento,
                    id_sede=rec.id_sede
                ).first()
                
                sede_info = {
                    'id': disponibilidad.sede.id,
                    'nombreSede': disponibilidad.sede.nombreSede,
                    'ubicacion': disponibilidad.sede.ubicacion
                } if disponibilidad and disponibilidad.sede else None
                
                rec_dict = rec.to_dict()
                rec_dict['sede'] = sede_info
                recolecciones_completas.append(rec_dict)
            
            return recolecciones_completas, None
        except SQLAlchemyError as e:
            return None, f"Error de base de datos: {str(e)}"
        except Exception as e:
            return None, f"Error inesperado: {str(e)}"