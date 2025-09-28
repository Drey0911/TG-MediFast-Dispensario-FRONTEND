import secrets
import string
from models.userModel import User
from config.connection import db
import jwt
import os
import re
from datetime import datetime, timedelta
from services.whatsappService import whatsapp_service

class UserService:
    @staticmethod
    def validate_password(password):
        """
        Verifica si la contraseña cumple con los requisitos de seguridad:
        - Mínimo 8 caracteres
        - Al menos 1 símbolo
        - Al menos 1 mayúscula
        - Al menos 1 número
        """
        errors = []
        
        # Verificar longitud mínima
        if len(password) < 8:
            errors.append("* 8 Caracteres minimos")
        
        # Verificar si contiene al menos 1 símbolo
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("* Al menos un simbolo (ej: !@#$%^&*)")
        
        # Verificar si contiene al menos 1 mayúscula
        if not re.search(r'[A-Z]', password):
            errors.append("* Al menos una mayuscula")
        
        # Verificar si contiene al menos 1 número
        if not re.search(r'[0-9]', password):
            errors.append("* Al menos un numero")
        
        if errors:
            return False, "\n".join(errors)
        
        return True, None
    
    
    @staticmethod
    def generate_random_password(length=10):
        """
        Genera una contraseña aleatoria que cumple con los requisitos de seguridad
        """
        # Definir caracteres para cada categoría
        lowercase = string.ascii_lowercase
        uppercase = string.ascii_uppercase
        digits = string.digits
        symbols = "!@#$%^&*"
        
        # Asegurar al menos un carácter de cada categoría
        password = [
            secrets.choice(lowercase),
            secrets.choice(uppercase),
            secrets.choice(digits),
            secrets.choice(symbols)
        ]
        
        # Completar el resto de la contraseña con caracteres aleatorios
        all_chars = lowercase + uppercase + digits + symbols
        for _ in range(length - 4):
            password.append(secrets.choice(all_chars))
        
        # Mezclar la contraseña
        secrets.SystemRandom().shuffle(password)
        
        return ''.join(password)
    
    @staticmethod
    def recover_password(dni, telefono):
        """
        Recupera la contraseña de un usuario y envía una nueva por WhatsApp
        """
        try:
            # Buscar el usuario por DNI y teléfono
            user = User.query.filter_by(dni=dni, telefono=telefono).first()
            
            if not user:
                return None, "No se encontró un usuario con esos datos"
            
            # Generar nueva contraseña temporal
            nueva_password = UserService.generate_random_password()
            
            # Actualizar la contraseña en la base de datos
            user.set_password(nueva_password)
            db.session.commit()
            
            # Enviar la nueva contraseña por WhatsApp
            nombre_completo = f"{user.nombre} {user.apellidos}"
            whatsapp_sent = whatsapp_service.send_password_recovery(
                to_number=telefono,
                nombre_usuario=nombre_completo,
                nueva_password=nueva_password
            )
            
            if not whatsapp_sent:
                # Si falla el envío de WhatsApp, revertir el cambio de contraseña
                db.session.rollback()
                return None, "Error al enviar el mensaje de WhatsApp. Inténtalo de nuevo."
            
            return {"message": "Nueva contraseña enviada por WhatsApp"}, None
            
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def create_user(nombre, apellidos, dni, telefono, password, rol='user'):
        try:
            # Verificar si la contraseña es válida
            is_valid, password_error = UserService.validate_password(password)
            if not is_valid:
                return None, f"Contraseña inválida, debes cumplir con:\n {password_error}"
            
            # Verificar si el usuario ya existe
            if User.query.filter_by(dni=dni).first():
                return None, "El usuario con este DNI ya existe"
            
            new_user = User(
                nombre=nombre,
                apellidos=apellidos,
                dni=dni,
                telefono=telefono,
                rol=rol
            )
            new_user.set_password(password)
            
            db.session.add(new_user)
            db.session.commit()
            
            return new_user.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def authenticate_user(dni, password):
        try:
            user = User.query.filter_by(dni=dni).first()
            if user and user.check_password(password):
                return user.to_dict(), None
            return None, "Credenciales inválidas"
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def get_all_users():
        try:
            users = User.query.all()
            return [user.to_dict() for user in users], None
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def get_user_by_id(user_id):
        try:
            user = User.query.get(user_id)
            if user:
                return user.to_dict(), None
            return None, "Usuario no encontrado"
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def update_user(user_id, data):
        try:
            user = User.query.get(user_id)
            if not user:
                return None, "Usuario no encontrado"
            
            # Verificar si se está actualizando la contraseña y si es válida
            if 'password' in data and data['password']:
                is_valid, password_error = UserService.validate_password(data['password'])
                if not is_valid:
                    return None, f"Contraseña inválida: {password_error}"
                user.set_password(data['password'])
            
            if 'nombre' in data:
                user.nombre = data['nombre']
            if 'apellidos' in data:
                user.apellidos = data['apellidos']
            if 'dni' in data:
                # Verificar si el nuevo DNI ya existe en otro usuario
                if data['dni'] != user.dni and User.query.filter_by(dni=data['dni']).first():
                    return None, "El DNI ya está en uso por otro usuario"
                user.dni = data['dni']
            if 'telefono' in data:
                # Verificar si el nuevo TELEFONO ya existe en otro usuario
                if data['telefono'] != user.telefono and User.query.filter_by(telefono=data['telefono']).first():
                    return None, "El telefono ya está en uso por otro usuario"
                user.telefono = data['telefono']
            if 'rol' in data:
                user.rol = data['rol']
            
            db.session.commit()
            return user.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def delete_user(user_id):
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "Usuario no encontrado"
            
            db.session.delete(user)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)
    
    @staticmethod
    def generate_jwt(user_data):
        payload = {
            'sub': str(user_data['id']),
            'nombre': user_data['nombre'],
            'apellidos': user_data['apellidos'],
            'dni': user_data['dni'],
            'telefono': user_data['telefono'],
            'rol': user_data['rol'],
            'exp': datetime.utcnow() + timedelta(days=7)
        }
        return jwt.encode(payload, os.getenv('JWT_SECRET'), algorithm='HS256')
    
    @staticmethod
    def verify_jwt(token):
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
            return payload, None
        except jwt.ExpiredSignatureError:
            return None, "Token expirado"
        except jwt.InvalidTokenError:
            return None, "Token inválido"