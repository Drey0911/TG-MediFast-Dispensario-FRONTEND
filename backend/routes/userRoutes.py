from flask import Blueprint, request, jsonify, current_app
from services.userService import UserService
from functools import wraps
from socketsExtends import socketio  # Importamos la instancia de SocketIO

user_routes = Blueprint('user_routes', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1] if len(request.headers['Authorization'].split(" ")) > 1 else None
        
        if not token:
            return jsonify({'error': 'Su sesión expiró, inicie sesión de nuevo'}), 401
        
        user_data, error = UserService.verify_jwt(token)
        if error:
            return jsonify({'error': error}), 401
        
        request.current_user = user_data
        return f(*args, **kwargs)
    
    return decorated

@user_routes.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not all(key in data for key in ['nombre', 'apellidos', 'dni','telefono', 'password']):
            return jsonify({'error': 'Faltan campos requeridos'}), 400
        
        user, error = UserService.create_user(
            data['nombre'],
            data['apellidos'],
            data['dni'],
            data['telefono'],
            data['password'],
            data.get('rol', 'user')
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        token = UserService.generate_jwt(user)
        
        # Emitir evento de WebSocket cuando se crea un usuario
        socketio.emit('usuario_creado', user, namespace='/')
        
        return jsonify({'user': user, 'token': token}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@user_routes.route('/recover-password', methods=['POST'])
def recover_password():
    try:
        data = request.get_json()
        
        if not all(key in data for key in ['dni', 'telefono']):
            return jsonify({'error': 'DNI y teléfono son requeridos'}), 400
        
        result, error = UserService.recover_password(data['dni'], data['telefono'])
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_routes.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not all(key in data for key in ['dni', 'password']):
            return jsonify({'error': 'DNI y contraseña son requeridos'}), 400
        
        user, error = UserService.authenticate_user(data['dni'], data['password'])
        
        if error:
            return jsonify({'error': error}), 401
        
        token = UserService.generate_jwt(user)
        return jsonify({'user': user, 'token': token}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_routes.route('/users', methods=['GET'])
@token_required
def get_users():
    try:
        users, error = UserService.get_all_users()
        if error:
            return jsonify({'error': error}), 400
        return jsonify(users), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_routes.route('/users/<int:user_id>', methods=['GET'])
@token_required
def get_user(user_id):
    try:
        user, error = UserService.get_user_by_id(user_id)
        if error:
            return jsonify({'error': error}), 404
        return jsonify(user), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_routes.route('/users/<int:user_id>', methods=['PUT'])
@token_required
def update_user(user_id):
    try:
        data = request.get_json()
        user, error = UserService.update_user(user_id, data)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se actualiza un usuario
        socketio.emit('usuario_actualizado', user, namespace='/')
        
        return jsonify(user), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_routes.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_user(user_id):
    try:
        success, error = UserService.delete_user(user_id)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se elimina un usuario
        socketio.emit('usuario_eliminado', {'id': user_id}, namespace='/')
        
        return jsonify({'message': 'Usuario eliminado correctamente'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_routes.route('/me', methods=['GET'])
@token_required
def get_current_user():
    try:
        user_id = request.current_user['sub']
        user, error = UserService.get_user_by_id(user_id)
        if error:
            return jsonify({'error': error}), 404
        return jsonify(user), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500