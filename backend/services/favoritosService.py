from models.favModel import Favoritos
from models.medModel import Medicamentos
from models.userModel import User
from config.connection import db

class FavoritosService:
    
    @staticmethod
    def agregar_favorito(id_usuario, id_medicamento):
        try:
            # Verificar si el medicamento existe
            medicamento = Medicamentos.query.get(id_medicamento)
            if not medicamento:
                return None, "Medicamento no encontrado"
            
            # Verificar si el usuario existe
            usuario = User.query.get(id_usuario)
            if not usuario:
                return None, "Usuario no encontrado"
            
            # Verificar si ya es favorito
            favorito_existente = Favoritos.query.filter_by(
                id_usuario=id_usuario, 
                id_medicamento=id_medicamento
            ).first()
            
            if favorito_existente:
                return None, "Este medicamento ya está en tus favoritos"
            
            # Crear nuevo favorito
            nuevo_favorito = Favoritos(
                id_usuario=id_usuario,
                id_medicamento=id_medicamento
            )
            
            db.session.add(nuevo_favorito)
            db.session.commit()
            
            return nuevo_favorito.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def obtener_favoritos_por_usuario(id_usuario):
        try:
            favoritos = Favoritos.query.filter_by(id_usuario=id_usuario).all()
            return [favorito.to_dict() for favorito in favoritos], None
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def verificar_favorito(id_usuario, id_medicamento):
        try:
            favorito = Favoritos.query.filter_by(
                id_usuario=id_usuario, 
                id_medicamento=id_medicamento
            ).first()
            
            return favorito is not None, None
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def eliminar_favorito(id_usuario, id_medicamento):
        try:
            favorito = Favoritos.query.filter_by(
                id_usuario=id_usuario, 
                id_medicamento=id_medicamento
            ).first()
            
            if not favorito:
                return False, "Favorito no encontrado"
            
            db.session.delete(favorito)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)
    
    @staticmethod
    def obtener_usuarios_por_favorito(id_medicamento):
        try:
            favoritos = Favoritos.query.filter_by(id_medicamento=id_medicamento).all()
            usuarios = [favorito.usuario.to_dict() for favorito in favoritos if favorito.usuario]
            return usuarios, None
        except Exception as e:
            return None, str(e)