from config.connection import db
from models.dispModel import Disponibilidad
from models.medModel import Medicamentos
from models.sedeModel import Sede
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload

class DispService:
    
    @staticmethod
    def create_disponibilidad(id_medicamento, id_sede, stock, estado=None):
        """
        Crea un nuevo registro de disponibilidad
        """
        try:
            # Verificar que el medicamento existe
            medicamento = Medicamentos.query.get(id_medicamento)
            if not medicamento:
                return None, "El medicamento especificado no existe"
            
            # Verificar que la sede existe
            sede = Sede.query.get(id_sede)
            if not sede:
                return None, "La sede especificada no existe"
            
            # Verificar que no existe ya un registro para esta combinación
            existing = Disponibilidad.query.filter_by(
                id_medicamento=id_medicamento,
                id_sede=id_sede
            ).first()
            
            if existing:
                return None, "Ya existe un registro de disponibilidad para esta combinación de medicamento y sede"
            
            # Auto-ajustar estado basado en stock
            if stock == 0:
                estado = 'agotado'
            elif stock <= 10:
                estado = 'poco_stock'
            else:
                estado = 'disponible'
            
            # Crear nueva disponibilidad
            nueva_disponibilidad = Disponibilidad(
                id_medicamento=id_medicamento,
                id_sede=id_sede,
                stock=stock,
                estado=estado
            )
            
            db.session.add(nueva_disponibilidad)
            db.session.commit()
            
            # Recargar con relaciones
            disponibilidad_completa = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).get(nueva_disponibilidad.id)
            
            return disponibilidad_completa.to_dict(), None
            
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Error de base de datos: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return None, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_disponibilidad_stock_bajo(limite=10):
        """
        Obtiene disponibilidades con stock bajo
        """
        try:
            disponibilidades = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).filter(Disponibilidad.stock <= limite, Disponibilidad.stock > 0).all()
            
            return [disp.to_dict() for disp in disponibilidades], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_disponibilidad_agotadas():
        """
        Obtiene disponibilidades agotadas (stock = 0)
        """
        try:
            disponibilidades = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).filter_by(stock=0).all()
            
            return [disp.to_dict() for disp in disponibilidades], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_disponibilidad_by_estado(estado):
        """
        Obtiene disponibilidades por estado específico
        """
        try:
            disponibilidades = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).filter_by(estado=estado).all()
            
            return [disp.to_dict() for disp in disponibilidades], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"
    
    @staticmethod
    def update_disponibilidad(disponibilidad_id, data):
        """
        Actualiza una disponibilidad existente
        """
        try:
            disponibilidad = Disponibilidad.query.get(disponibilidad_id)
            if not disponibilidad:
                return None, "Disponibilidad no encontrada"
            
            # Actualizar campos
            if 'stock' in data:
                stock = int(data['stock'])
                disponibilidad.stock = stock
                
                # Auto-ajustar estado basado en stock si no se proporciona estado específico
                if 'estado' not in data:
                    if stock == 0:
                        disponibilidad.estado = 'agotado'
                    elif stock <= 10:
                        disponibilidad.estado = 'poco_stock'
                    else:
                        disponibilidad.estado = 'disponible'
            
            if 'estado' in data:
                disponibilidad.estado = data['estado']
            
            db.session.commit()
            
            # Recargar con relaciones
            disponibilidad_actualizada = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).get(disponibilidad_id)
            
            return disponibilidad_actualizada.to_dict(), None
            
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Error de base de datos: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return None, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def delete_disponibilidad(disponibilidad_id):
        """
        Elimina una disponibilidad
        """
        try:
            disponibilidad = Disponibilidad.query.get(disponibilidad_id)
            if not disponibilidad:
                return False, "Disponibilidad no encontrada"
            
            db.session.delete(disponibilidad)
            db.session.commit()
            
            return True, None
            
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Error de base de datos: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return False, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def search_disponibilidad(medicamento_nombre="", sede_nombre="", estado=""):
        """
        Busca disponibilidades por criterios múltiples
        """
        try:
            query = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            )
            
            if medicamento_nombre:
                query = query.join(Medicamentos).filter(
                    Medicamentos.nombreMedicamento.ilike(f"%{medicamento_nombre}%")
                )
            
            if sede_nombre:
                query = query.join(Sede).filter(
                    Sede.nombreSede.ilike(f"%{sede_nombre}%")
                )
            
            if estado:
                query = query.filter(Disponibilidad.estado == estado)
            
            disponibilidades = query.all()
            
            return [disp.to_dict() for disp in disponibilidades], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_resumen_disponibilidad():
        """
        Obtiene un resumen general de disponibilidad
        """
        try:
            total_registros = Disponibilidad.query.count()
            disponibles = Disponibilidad.query.filter_by(estado='disponible').count()
            poco_stock = Disponibilidad.query.filter_by(estado='poco_stock').count()
            agotados = Disponibilidad.query.filter_by(estado='agotado').count()
            
            # Stock total en sistema
            stock_total = db.session.query(db.func.sum(Disponibilidad.stock)).scalar() or 0
            
            resumen = {
                'total_registros': total_registros,
                'disponibles': disponibles,
                'poco_stock': poco_stock,
                'agotados': agotados,
                'stock_total': stock_total
            }
            
            return resumen, None
            
        except SQLAlchemyError as e:
            return {}, f"Error de base de datos: {str(e)}"
        except Exception as e:
            return {}, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_medicamentos_disponibles_en_sede(sede_id):
        """
        Obtiene todos los medicamentos disponibles en una sede específica
        """
        try:
            disponibilidades = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).filter(
                Disponibilidad.id_sede == sede_id,
                Disponibilidad.stock > 0
            ).all()
            
            return [disp.to_dict() for disp in disponibilidades], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_sedes_con_medicamento(medicamento_id):
        """
        Obtiene todas las sedes que tienen disponible un medicamento específico
        """
        try:
            disponibilidades = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).filter(
                Disponibilidad.id_medicamento == medicamento_id,
                Disponibilidad.stock > 0
            ).all()
            
            return [disp.to_dict() for disp in disponibilidades], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"
    
    @staticmethod
    def ajustar_stock(disponibilidad_id, cantidad):
        """
        Ajusta el stock de una disponibilidad (suma o resta)
        """
        try:
            disponibilidad = Disponibilidad.query.get(disponibilidad_id)
            if not disponibilidad:
                return None, "Disponibilidad no encontrada"
            
            nuevo_stock = max(0, disponibilidad.stock + cantidad)
            
            # Auto-ajustar estado basado en nuevo stock
            if nuevo_stock == 0:
                nuevo_estado = 'agotado'
            elif nuevo_stock <= 10:
                nuevo_estado = 'poco_stock'
            else:
                nuevo_estado = 'disponible'
            
            disponibilidad.stock = nuevo_stock
            disponibilidad.estado = nuevo_estado
            
            db.session.commit()
            
            # Recargar con relaciones
            disponibilidad_actualizada = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).get(disponibilidad_id)
            
            return disponibilidad_actualizada.to_dict(), None
            
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Error de base de datos: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return None, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_all_disponibilidad():
        """
        Obtiene todas las disponibilidades con sus relaciones
        """
        try:
            disponibilidades = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).all()
            
            return [disp.to_dict() for disp in disponibilidades], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_disponibilidad_by_id(disponibilidad_id):
        """
        Obtiene una disponibilidad por su ID
        """
        try:
            disponibilidad = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).get(disponibilidad_id)
            
            if not disponibilidad:
                return None, "Disponibilidad no encontrada"
            
            return disponibilidad.to_dict(), None
            
        except SQLAlchemyError as e:
            return None, f"Error de base de datos: {str(e)}"
        except Exception as e:
            return None, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_disponibilidad_by_medicamento_sede(id_medicamento, id_sede):
        """
        Obtiene disponibilidad por medicamento y sede específicos
        """
        try:
            disponibilidad = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).filter_by(id_medicamento=id_medicamento, id_sede=id_sede).first()
            
            if not disponibilidad:
                return None, "No se encontró disponibilidad para esta combinación"
            
            return disponibilidad.to_dict(), None
            
        except SQLAlchemyError as e:
            return None, f"Error de base de datos: {str(e)}"
        except Exception as e:
            return None, f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_disponibilidad_by_sede(sede_id):
        """
        Obtiene todas las disponibilidades de una sede específica
        """
        try:
            disponibilidades = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).filter_by(id_sede=sede_id).all()
            
            return [disp.to_dict() for disp in disponibilidades], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"
    
    @staticmethod
    def get_disponibilidad_by_medicamento(medicamento_id):
        """
        Obtiene todas las disponibilidades de un medicamento específico
        """
        try:
            disponibilidades = Disponibilidad.query.options(
                joinedload(Disponibilidad.medicamento),
                joinedload(Disponibilidad.sede)
            ).filter_by(id_medicamento=medicamento_id).all()
            
            return [disp.to_dict() for disp in disponibilidades], None
            
        except SQLAlchemyError as e:
            return [], f"Error de base de datos: {str(e)}"
        except Exception as e:
            return [], f"Error inesperado: {str(e)}"