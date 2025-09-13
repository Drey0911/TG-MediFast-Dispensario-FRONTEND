# models/recoleccionModel.py
from config.connection import db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import random
import string

class Recoleccion(db.Model):
    __tablename__ = 'recoleccion'
    
    id = db.Column(db.Integer, primary_key=True)
    id_medicamento = db.Column(db.Integer, ForeignKey('medicamentos.id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    id_usuario = db.Column(db.Integer, ForeignKey('usuarios.id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    NoRecoleccion = db.Column(db.String(50), nullable=False)
    fechaRecoleccion = db.Column(db.Date, nullable=False)
    horaRecoleccion = db.Column(db.Time, nullable=False)
    horaVencimiento = db.Column(db.Time, nullable=False)
    cantidad = db.Column(db.Integer, nullable=False, default=1) 
    cumplimiento = db.Column(db.Boolean, nullable=False, default=0)
    
    # Relaciones
    medicamento = relationship('Medicamentos', backref=db.backref('recoleccion', cascade='all, delete-orphan', lazy='dynamic'))
    usuario = relationship('User', backref=db.backref('recoleccion', cascade='all, delete-orphan', lazy='dynamic')) 
    
    def to_dict(self):
        return {
            'id': self.id,
            'id_medicamento': self.id_medicamento,
            'id_usuario': self.id_usuario,
            'NoRecoleccion': self.NoRecoleccion,
            'fechaRecoleccion': self.fechaRecoleccion.isoformat() if self.fechaRecoleccion else None,
            'horaRecoleccion': self.horaRecoleccion.isoformat() if self.horaRecoleccion else None,
            'horaVencimiento': self.horaVencimiento.isoformat() if self.horaVencimiento else None,
            'cantidad': self.cantidad,
            'cumplimiento': self.cumplimiento,
            # Datos relacionados
            'medicamento': self.medicamento.to_dict() if hasattr(self.medicamento, 'to_dict') and self.medicamento else None,
            'usuario': self.usuario.to_dict() if hasattr(self.usuario, 'to_dict') and self.usuario else None
        }
    
    @staticmethod
    def generate_no_recoleccion():
        """Genera un número de recolección único"""
        letters = ''.join(random.choices(string.ascii_uppercase, k=3))
        numbers = ''.join(random.choices(string.digits, k=3))
        return f"{letters}{numbers}"
    
    @classmethod
    def create_table_if_not_exists(cls):
        try:
            inspector = db.inspect(db.engine)
            if not inspector.has_table(cls.__tablename__):
                cls.__table__.create(db.engine)
                print(f"Tabla {cls.__tablename__} creada exitosamente")
            else:
                print(f"Tabla {cls.__tablename__} ya existe")
        except SQLAlchemyError as e:
            print(f"Error al crear la tabla: {str(e)}")