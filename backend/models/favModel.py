from config.connection import db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship

class Favoritos(db.Model):
    __tablename__ = 'favoritos'
    
    id = db.Column(db.Integer, primary_key=True)
    id_medicamento = db.Column(db.Integer, ForeignKey('medicamentos.id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    id_usuario = db.Column(db.Integer, ForeignKey('usuarios.id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    
    # Relaciones
    medicamento = relationship('Medicamentos',backref=db.backref('favoritos', cascade='all, delete-orphan',lazy='dynamic'))
    usuario = relationship('User',backref=db.backref('favoritos', cascade='all, delete-orphan',lazy='dynamic')) 
    
    def to_dict(self):
        return {
            'id': self.id,
            'id_medicamento': self.id_medicamento,
            'id_usuario': self.id_usuario,
            # Datos relacionados
            'medicamento': self.medicamento.to_dict() if hasattr(self.medicamento, 'to_dict') and self.medicamento else None,
            'usuario': self.usuario.to_dict() if hasattr(self.usuario, 'to_dict') and self.usuario else None
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