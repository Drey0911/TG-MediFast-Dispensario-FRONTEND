from config.connection import db
from sqlalchemy.exc import SQLAlchemyError
import bcrypt
import base64
import os

class Medicamentos(db.Model):
    __tablename__ = 'medicamentos'
    
    id = db.Column(db.Integer, primary_key=True)
    nombreMedicamento = db.Column(db.String(100), nullable=False)
    tipo = db.Column(db.String(100), nullable=False)
    referencia = db.Column(db.String(20), unique=True, nullable=False)
    descripcion = db.Column(db.String(255))
    foto = db.Column(db.LargeBinary(length=4294967295), nullable=True)  # Campo para almacenar la imagen binaria
    nombre_archivo = db.Column(db.String(255), nullable=True)  # Nombre original del archivo
    tipo_mime = db.Column(db.String(100), nullable=True)  # Tipo MIME de la imagen
    
    def to_dict(self):
        # Convertir imagen binaria a base64 para enviar como JSON
        foto_base64 = None
        if self.foto:
            foto_base64 = base64.b64encode(self.foto).decode('utf-8')
        
        return {
            'id': self.id,
            'nombreMedicamento': self.nombreMedicamento,
            'tipo': self.tipo,
            'referencia': self.referencia,
            'descripcion': self.descripcion,
            'foto': foto_base64,
            'nombre_archivo': self.nombre_archivo,
            'tipo_mime': self.tipo_mime
        }
    
    def set_foto(self, file_data, filename, content_type):
        """Método para establecer la foto desde datos de archivo"""
        self.foto = file_data
        self.nombre_archivo = filename
        self.tipo_mime = content_type
    
    def get_foto_base64(self):
        """Obtener la foto en formato base64"""
        if self.foto:
            return base64.b64encode(self.foto).decode('utf-8')
        return None
    
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