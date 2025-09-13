from flask import Blueprint, request, jsonify, current_app
from services.recoleccionService import RecoleccionService
from functools import wraps
from socketsExtends import socketio  # Importamos la instancia de SocketIO

recoleccion_routes = Blueprint('recoleccion_routes', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1] if len(request.headers['Authorization'].split(" ")) > 1 else None
        
        if not token:
            return jsonify({'error': 'Token es requerido'}), 401
        
        # Importamos UserService aquí para evitar imports circulares
        from services.userService import UserService
        user_data, error = UserService.verify_jwt(token)
        if error:
            return jsonify({'error': error}), 401
        
        request.current_user = user_data
        return f(*args, **kwargs)
    
    return decorated

@recoleccion_routes.route('/recolecciones/batch', methods=['POST'])
@token_required
def create_recoleccion_batch():
    """Crear múltiples recolecciones con el mismo NoRecoleccion"""
    try:
        data = request.get_json()
        if not data or not isinstance(data, list):
            return jsonify({'error': 'Se esperaba una lista de recolecciones'}), 400
        
        if len(data) == 0:
            return jsonify({'error': 'La lista de recolecciones está vacía'}), 400
        
        # Verificar que el usuario solo crea recolecciones para sí mismo
        user_id = data[0].get('id_usuario')
        if request.current_user.get('sub') != user_id and request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'No puedes crear recolecciones para otros usuarios'}), 403
        
        recolecciones, error = RecoleccionService.create_recoleccion_batch(data)
        
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket
        socketio.emit('recolecciones_creadas', recolecciones, namespace='/')
        
        return jsonify(recolecciones), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recoleccion_routes.route('/recolecciones', methods=['POST'])
@token_required
def create_recoleccion():
    """Crear nueva recolección"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        id_medicamento = data.get('id_medicamento')
        id_usuario = data.get('id_usuario')
        fecha_recoleccion = data.get('fechaRecoleccion')
        hora_recoleccion = data.get('horaRecoleccion')
        
        # Validar campos requeridos
        if not all([id_medicamento, id_usuario, fecha_recoleccion, hora_recoleccion]):
            return jsonify({'error': 'Todos los campos son requeridos'}), 400
        
        # Verificar que el usuario solo crea recolecciones para sí mismo
        if request.current_user.get('sub') != id_usuario and request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'No puedes crear recolecciones para otros usuarios'}), 403
        
        recoleccion, error = RecoleccionService.create_recoleccion(
            id_medicamento=id_medicamento,
            id_usuario=id_usuario,
            fecha_recoleccion=fecha_recoleccion,
            hora_recoleccion=hora_recoleccion
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se crea una recolección
        socketio.emit('recoleccion_creada', recoleccion, namespace='/')
        
        return jsonify(recoleccion), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recoleccion_routes.route('/recolecciones', methods=['GET'])
@token_required
def get_recolecciones():
    """Obtener todas las recolecciones (solo admin)"""
    try:
        # Verificar que el usuario sea admin
        if request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'Acceso denegado. Se requieren permisos de administrador'}), 403
        
        recolecciones, error = RecoleccionService.get_all_recolecciones()
        if error:
            return jsonify({'error': error}), 400
        return jsonify(recolecciones), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recoleccion_routes.route('/recolecciones/usuario/<int:usuario_id>', methods=['GET'])
@token_required
def get_recolecciones_by_usuario(usuario_id):
    """Obtener recolecciones de un usuario específico"""
    try:
        # Verificar que el usuario solo vea sus propias recolecciones
        if request.current_user.get('sub') != usuario_id and request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'No puedes ver las recolecciones de otros usuarios'}), 403
        
        recolecciones, error = RecoleccionService.get_recolecciones_by_usuario(usuario_id)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(recolecciones), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recoleccion_routes.route('/recolecciones/<int:recoleccion_id>', methods=['GET'])
@token_required
def get_recoleccion(recoleccion_id):
    """Obtener recolección por ID"""
    try:
        recoleccion, error = RecoleccionService.get_recoleccion_by_id(recoleccion_id)
        if error:
            return jsonify({'error': error}), 404
        
        # Verificar que el usuario solo vea sus propias recolecciones
        if request.current_user.get('sub') != recoleccion['id_usuario'] and request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'No puedes ver esta recolección'}), 403
        
        return jsonify(recoleccion), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recoleccion_routes.route('/recolecciones/estado/<int:estado>', methods=['GET'])
@token_required
def get_recolecciones_by_estado(estado):
    """Obtener recolecciones por estado"""
    try:
        # Verificar que el usuario sea admin
        if request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'Acceso denegado. Se requieren permisos de administrador'}), 403
        
        recolecciones, error = RecoleccionService.get_recolecciones_by_estado(estado)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(recolecciones), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recoleccion_routes.route('/recolecciones/<int:recoleccion_id>', methods=['PUT'])
@token_required
def update_recoleccion(recoleccion_id):
    """Actualizar recolección"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        # Obtener recolección actual para verificar permisos
        recoleccion_actual, error = RecoleccionService.get_recoleccion_by_id(recoleccion_id)
        if error:
            return jsonify({'error': error}), 404
        
        # Verificar que el usuario solo actualice sus propias recolecciones
        if request.current_user.get('sub') != recoleccion_actual['id_usuario'] and request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'No puedes actualizar esta recolección'}), 403
        
        recoleccion, error = RecoleccionService.update_recoleccion(recoleccion_id, data)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se actualiza una recolección
        socketio.emit('recoleccion_actualizada', recoleccion, namespace='/')
        
        return jsonify(recoleccion), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recoleccion_routes.route('/recolecciones/<int:recoleccion_id>', methods=['DELETE'])
@token_required
def delete_recoleccion(recoleccion_id):
    """Eliminar recolección"""
    try:
        # Obtener recolección para verificar permisos
        recoleccion, error = RecoleccionService.get_recoleccion_by_id(recoleccion_id)
        if error:
            return jsonify({'error': error}), 404
        
        # Verificar que el usuario solo elimine sus propias recolecciones
        if request.current_user.get('sub') != recoleccion['id_usuario'] and request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'No puedes eliminar esta recolección'}), 403
        
        success, error = RecoleccionService.delete_recoleccion(recoleccion_id)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se elimina una recolección
        socketio.emit('recoleccion_eliminada', {'id': recoleccion_id}, namespace='/')
        
        return jsonify({'message': 'Recolección eliminada correctamente'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recoleccion_routes.route('/recolecciones/check-vencimientos', methods=['POST'])
@token_required
def check_vencimientos():
    """Verificar y actualizar recolecciones vencidas (solo admin)"""
    try:
        # Verificar que el usuario sea admin
        if request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'Acceso denegado. Se requieren permisos de administrador'}), 403
        
        count, error = RecoleccionService.check_vencimientos()
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({'message': f'Se actualizaron {count} recolecciones vencidas'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500