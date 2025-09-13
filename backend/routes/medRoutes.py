from flask import Blueprint, request, jsonify, current_app
from services.medService import MedService
from functools import wraps
from socketsExtends import socketio  # Importamos la instancia de SocketIO

med_routes = Blueprint('med_routes', __name__)

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

@med_routes.route('/medicamentos', methods=['POST'])
@token_required
def create_medicamento():
    try:
        # Verificar si es una solicitud con archivo
        if 'foto' in request.files:
            # Datos del formulario con archivo
            nombre_medicamento = request.form.get('nombreMedicamento')
            tipo = request.form.get('tipo')
            referencia = request.form.get('referencia')
            descripcion = request.form.get('descripcion')
            foto = request.files['foto']
        else:
            # Datos JSON sin archivo
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No se proporcionaron datos'}), 400
                
            nombre_medicamento = data.get('nombreMedicamento')
            tipo = data.get('tipo')
            referencia = data.get('referencia')
            descripcion = data.get('descripcion')
            foto = None
        
        # Validar campos requeridos
        if not all([nombre_medicamento, tipo, referencia]):
            return jsonify({'error': 'Los campos nombreMedicamento, tipo y referencia son requeridos'}), 400
        
        medicamento, error = MedService.create_medicamento(
            nombre_medicamento=nombre_medicamento,
            tipo=tipo,
            referencia=referencia,
            descripcion=descripcion,
            foto=foto
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se crea un medicamento
        socketio.emit('medicamento_creado', medicamento, namespace='/')
        
        return jsonify(medicamento), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@med_routes.route('/medicamentos', methods=['GET'])
@token_required
def get_medicamentos():
    try:
        medicamentos, error = MedService.get_all_medicamentos()
        if error:
            return jsonify({'error': error}), 400
        return jsonify(medicamentos), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@med_routes.route('/medicamentos/<int:medicamento_id>', methods=['GET'])
@token_required
def get_medicamento(medicamento_id):
    try:
        medicamento, error = MedService.get_medicamento_by_id(medicamento_id)
        if error:
            return jsonify({'error': error}), 404
        return jsonify(medicamento), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@med_routes.route('/medicamentos/referencia/<string:referencia>', methods=['GET'])
@token_required
def get_medicamento_by_referencia(referencia):
    try:
        medicamento, error = MedService.get_medicamento_by_referencia(referencia)
        if error:
            return jsonify({'error': error}), 404
        return jsonify(medicamento), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@med_routes.route('/medicamentos/<int:medicamento_id>', methods=['PUT'])
@token_required
def update_medicamento(medicamento_id):
    try:
        # Verificar si es una solicitud con archivo
        if 'foto' in request.files:
            # Datos del formulario con archivo
            data = {
                'nombreMedicamento': request.form.get('nombreMedicamento'),
                'tipo': request.form.get('tipo'),
                'referencia': request.form.get('referencia'),
                'descripcion': request.form.get('descripcion')
            }
            foto = request.files['foto']
        else:
            # Datos JSON sin archivo
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No se proporcionaron datos'}), 400
            foto = None
        
        medicamento, error = MedService.update_medicamento(medicamento_id, data, foto)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se actualiza un medicamento
        socketio.emit('medicamento_actualizado', medicamento, namespace='/')
        
        return jsonify(medicamento), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@med_routes.route('/medicamentos/<int:medicamento_id>', methods=['DELETE'])
@token_required
def delete_medicamento(medicamento_id):
    try:
        success, error = MedService.delete_medicamento(medicamento_id)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se elimina un medicamento
        socketio.emit('medicamento_eliminado', {'id': medicamento_id}, namespace='/')
        
        return jsonify({'message': 'Medicamento eliminado correctamente'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@med_routes.route('/medicamentos/search', methods=['GET'])
@token_required
def search_medicamentos():
    try:
        # Obtener parámetros de búsqueda
        nombre = request.args.get('nombre', '').strip()
        tipo = request.args.get('tipo', '').strip()
        referencia = request.args.get('referencia', '').strip()
        
        if not any([nombre, tipo, referencia]):
            return jsonify({'error': 'Se debe proporcionar al menos un parámetro de búsqueda'}), 400
        
        medicamentos, error = MedService.search_medicamentos(nombre, tipo, referencia)
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify(medicamentos), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500