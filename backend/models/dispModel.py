from config.connection import db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship

class Disponibilidad(db.Model):
    __tablename__ = 'disponibilidad'
    
    id = db.Column(db.Integer, primary_key=True)
    id_medicamento = db.Column(db.Integer, ForeignKey('medicamentos.id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    id_sede = db.Column(db.Integer, ForeignKey('sedes.id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)
    estado = db.Column(db.String(20), nullable=False, default='disponible')
    
    # Relaciones
    medicamento = relationship('Medicamentos',backref=db.backref('disponibilidad', cascade='all, delete-orphan',lazy='dynamic'))
    sede = relationship('Sede',backref=db.backref('disponibilidad', cascade='all, delete-orphan',lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'id_medicamento': self.id_medicamento,
            'id_sede': self.id_sede,
            'stock': self.stock,
            'estado': self.estado,
            # Datos relacionados
            'medicamento': self.medicamento.to_dict() if hasattr(self.medicamento, 'to_dict') and self.medicamento else None,
            'sede': self.sede.to_dict() if hasattr(self.sede, 'to_dict') and self.sede else None
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