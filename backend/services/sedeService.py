from models.sedeModel import Sede
from config.connection import db
from sqlalchemy.exc import SQLAlchemyError

class SedeService:
    @staticmethod
    def create_sede(nombreSede, ciudad, ubicacion):
        try:
            # Verificar si la sede ya existe
            if Sede.query.filter_by(nombreSede=nombreSede).first():
                return None, "Ya existe una sede con ese nombre"
            
            nueva_sede = Sede(
                nombreSede=nombreSede,
                ciudad=ciudad,
                ubicacion=ubicacion
            )
            
            db.session.add(nueva_sede)
            db.session.commit()
            
            return nueva_sede.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def get_all_sedes():
        try:
            sedes = Sede.query.all()
            return [sede.to_dict() for sede in sedes], None
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def get_sede_by_id(sede_id):
        try:
            sede = Sede.query.get(sede_id)
            if sede:
                return sede.to_dict(), None
            return None, "Sede no encontrada"
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def update_sede(sede_id, data):
        try:
            sede = Sede.query.get(sede_id)
            if not sede:
                return None, "Sede no encontrada"
            
            # Verificar si el nuevo nombre ya existe en otra sede
            if 'nombreSede' in data and data['nombreSede'] != sede.nombreSede:
                if Sede.query.filter_by(nombreSede=data['nombreSede']).first():
                    return None, "Ya existe una sede con ese nombre"
            
            if 'nombreSede' in data:
                sede.nombreSede = data['nombreSede']
            if 'ciudad' in data:
                sede.ciudad = data['ciudad']
            if 'ubicacion' in data:
                sede.ubicacion = data['ubicacion']
            
            db.session.commit()
            return sede.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def delete_sede(sede_id):
        try:
            sede = Sede.query.get(sede_id)
            if not sede:
                return False, "Sede no encontrada"
            
            db.session.delete(sede)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)