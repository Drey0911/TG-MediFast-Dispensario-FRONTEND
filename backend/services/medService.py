from models.medModel import Medicamentos
from config.connection import db
from werkzeug.utils import secure_filename
import os
import mimetypes
from sqlalchemy import or_

class MedService:
    
    # Extensiones de archivo permitidas para imágenes
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'}
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB máximo
    
    @staticmethod
    def allowed_file(filename):
        """Verificar si el archivo tiene una extensión permitida"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in MedService.ALLOWED_EXTENSIONS
    
    @staticmethod
    def validate_file_size(file_data):
        """Verificar el tamaño del archivo"""
        if len(file_data) > MedService.MAX_FILE_SIZE:
            return False
        return True
    
    @staticmethod
    def process_image_file(foto):
        """Procesar el archivo de imagen subido"""
        if not foto or foto.filename == '':
            return None, None, None
        
        if not MedService.allowed_file(foto.filename):
            return None, None, "Tipo de archivo no permitido. Use: png, jpg, jpeg, gif, webp, bmp"
        
        try:
            # Leer los datos del archivo
            file_data = foto.read()
            
            # Verificar el tamaño
            if not MedService.validate_file_size(file_data):
                return None, None, "El archivo es demasiado grande. Máximo 5MB"
            
            # Obtener información del archivo
            filename = secure_filename(foto.filename)
            content_type = foto.content_type or mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            
            return file_data, filename, content_type
        except Exception as e:
            return None, None, f"Error al procesar la imagen: {str(e)}"
    
    @staticmethod
    def create_medicamento(nombre_medicamento, tipo, referencia, descripcion=None, foto=None):
        try:
            # Verificar si la referencia ya existe
            if Medicamentos.query.filter_by(referencia=referencia).first():
                return None, "Ya existe un medicamento con esta referencia"
            
            # Procesar la imagen si se proporciona
            file_data, filename, content_type, error_msg = None, None, None, None
            if foto:
                file_data, filename, content_type = MedService.process_image_file(foto)
                if content_type is None:  # Error en el procesamiento
                    return None, filename  # filename contiene el mensaje de error
            
            # Crear el nuevo medicamento
            nuevo_medicamento = Medicamentos(
                nombreMedicamento=nombre_medicamento,
                tipo=tipo,
                referencia=referencia,
                descripcion=descripcion
            )
            
            # Establecer la foto si se proporcionó
            if file_data:
                nuevo_medicamento.set_foto(file_data, filename, content_type)
            
            db.session.add(nuevo_medicamento)
            db.session.commit()
            
            return nuevo_medicamento.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def get_all_medicamentos():
        try:
            medicamentos = Medicamentos.query.all()
            return [medicamento.to_dict() for medicamento in medicamentos], None
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def get_medicamento_by_id(medicamento_id):
        try:
            medicamento = Medicamentos.query.get(medicamento_id)
            if medicamento:
                return medicamento.to_dict(), None
            return None, "Medicamento no encontrado"
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def get_medicamento_by_referencia(referencia):
        try:
            medicamento = Medicamentos.query.filter_by(referencia=referencia).first()
            if medicamento:
                return medicamento.to_dict(), None
            return None, "Medicamento no encontrado"
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def update_medicamento(medicamento_id, data, foto=None):
        try:
            medicamento = Medicamentos.query.get(medicamento_id)
            if not medicamento:
                return None, "Medicamento no encontrado"
            
            # Actualizar campos básicos si se proporcionan
            if 'nombreMedicamento' in data and data['nombreMedicamento']:
                medicamento.nombreMedicamento = data['nombreMedicamento']
            
            if 'tipo' in data and data['tipo']:
                medicamento.tipo = data['tipo']
            
            if 'referencia' in data and data['referencia']:
                # Verificar si la nueva referencia ya existe en otro medicamento
                if (data['referencia'] != medicamento.referencia and 
                    Medicamentos.query.filter_by(referencia=data['referencia']).first()):
                    return None, "La referencia ya está en uso por otro medicamento"
                medicamento.referencia = data['referencia']
            
            if 'descripcion' in data:
                medicamento.descripcion = data['descripcion']
            
            # Procesar nueva imagen si se proporciona
            if foto:
                file_data, filename, content_type = MedService.process_image_file(foto)
                if content_type is None:  # Error en el procesamiento
                    return None, filename  # filename contiene el mensaje de error
                
                # Actualizar la imagen
                medicamento.set_foto(file_data, filename, content_type)
            
            db.session.commit()
            return medicamento.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def delete_medicamento(medicamento_id):
        try:
            medicamento = Medicamentos.query.get(medicamento_id)
            if not medicamento:
                return False, "Medicamento no encontrado"
            
            db.session.delete(medicamento)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)
    
    @staticmethod
    def search_medicamentos(nombre=None, tipo=None, referencia=None):
        try:
            query = Medicamentos.query
            conditions = []
            
            if nombre:
                conditions.append(Medicamentos.nombreMedicamento.ilike(f'%{nombre}%'))
            
            if tipo:
                conditions.append(Medicamentos.tipo.ilike(f'%{tipo}%'))
            
            if referencia:
                conditions.append(Medicamentos.referencia.ilike(f'%{referencia}%'))
            
            if conditions:
                query = query.filter(or_(*conditions))
            
            medicamentos = query.all()
            return [medicamento.to_dict() for medicamento in medicamentos], None
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def get_medicamentos_by_tipo(tipo):
        """Obtener medicamentos por tipo específico"""
        try:
            medicamentos = Medicamentos.query.filter_by(tipo=tipo).all()
            return [medicamento.to_dict() for medicamento in medicamentos], None
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def get_tipos_disponibles():
        """Obtener todos los tipos de medicamentos disponibles"""
        try:
            # Consulta para obtener tipos únicos
            tipos = db.session.query(Medicamentos.tipo).distinct().all()
            return [tipo[0] for tipo in tipos if tipo[0]], None
        except Exception as e:
            return None, str(e)