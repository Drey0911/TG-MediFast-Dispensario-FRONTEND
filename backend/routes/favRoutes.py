from flask import Blueprint, request, jsonify
from services.favoritosService import FavoritosService
from functools import wraps
from socketsExtends import socketio

favoritos_routes = Blueprint('favoritos_routes', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1] if len(request.headers['Authorization'].split(" ")) > 1 else None
        
        if not token:
            return jsonify({'error': 'Su sesión expiró, inicie sesión de nuevo'}), 401
        
        from services.userService import UserService
        user_data, error = UserService.verify_jwt(token)
        if error:
            return jsonify({'error': error}), 401
        
        request.current_user = user_data
        return f(*args, **kwargs)
    
    return decorated

@favoritos_routes.route('/favoritos', methods=['POST'])
@token_required
def agregar_favorito():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        id_medicamento = data.get('id_medicamento')
        id_usuario = request.current_user.get('sub')
        
        if not id_medicamento:
            return jsonify({'error': 'El id_medicamento es requerido'}), 400
        
        favorito, error = FavoritosService.agregar_favorito(id_usuario, id_medicamento)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket
        socketio.emit('favorito_agregado', favorito, namespace='/')
        
        return jsonify(favorito), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@favoritos_routes.route('/favoritos/usuario', methods=['GET'])
@token_required
def obtener_favoritos_usuario():
    try:
        id_usuario = request.current_user.get('sub')
        favoritos, error = FavoritosService.obtener_favoritos_por_usuario(id_usuario)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(favoritos), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@favoritos_routes.route('/favoritos/<int:id_medicamento>', methods=['GET'])
@token_required
def verificar_favorito(id_medicamento):
    try:
        id_usuario = request.current_user.get('sub')
        es_favorito, error = FavoritosService.verificar_favorito(id_usuario, id_medicamento)
        if error:
            return jsonify({'error': error}), 400
        return jsonify({'es_favorito': es_favorito}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@favoritos_routes.route('/favoritos/<int:id_medicamento>', methods=['DELETE'])
@token_required
def eliminar_favorito(id_medicamento):
    try:
        id_usuario = request.current_user.get('sub')
        success, error = FavoritosService.eliminar_favorito(id_usuario, id_medicamento)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket
        socketio.emit('favorito_eliminado', {
            'id_usuario': id_usuario, 
            'id_medicamento': id_medicamento
        }, namespace='/')
        
        return jsonify({'message': 'Favorito eliminado correctamente'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@favoritos_routes.route('/favoritos/medicamento/<int:id_medicamento>', methods=['GET'])
@token_required
def obtener_usuarios_favorito(id_medicamento):
    try:
        usuarios, error = FavoritosService.obtener_usuarios_por_favorito(id_medicamento)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(usuarios), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500