from config.connection import db
from sqlalchemy.exc import SQLAlchemyError
import bcrypt

class Sede(db.Model):
    __tablename__ = 'sedes'
    
    id = db.Column(db.Integer, primary_key=True)
    nombreSede = db.Column(db.String(100), nullable=False)
    ciudad = db.Column(db.String(100), nullable=False)
    ubicacion = db.Column(db.String(20), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nombreSede': self.nombreSede,
            'ciudad': self.ciudad,
            'ubicacion': self.ubicacion,
        }
    
    @classmethod
    def create_table_if_not_exists(cls):
        try:
            # Verificar si la tabla ya existe
            inspector = db.inspect(db.engine)
            if not inspector.has_table(cls.__tablename__):
                cls.__table__.create(db.engine)
                print(f"Tabla {cls.__tablename__} creada exitosamente")
            else:
                print(f"Tabla {cls.__tablename__} ya existe")
        except SQLAlchemyError as e:
            print(f"Error al crear la tabla: {str(e)}")