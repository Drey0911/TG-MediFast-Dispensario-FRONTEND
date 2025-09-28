from flask import Blueprint, request, jsonify, current_app
from services.dispService import DispService
from functools import wraps
from socketsExtends import socketio  # Importamos la instancia de SocketIO

disp_routes = Blueprint('disp_routes', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1] if len(request.headers['Authorization'].split(" ")) > 1 else None
        
        if not token:
            return jsonify({'error': 'Su sesión expiró, inicie sesión de nuevo'}), 401
        
        # Importamos UserService aquí para evitar imports circulares
        from services.userService import UserService
        user_data, error = UserService.verify_jwt(token)
        if error:
            return jsonify({'error': error}), 401
        
        request.current_user = user_data
        return f(*args, **kwargs)
    
    return decorated

@disp_routes.route('/disponibilidad', methods=['POST'])
@token_required
def create_disponibilidad():
    """Crear nueva disponibilidad (solo admin)"""
    try:
        # Verificar que el usuario sea admin
        if request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'Acceso denegado. Se requieren permisos de administrador'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        id_medicamento = data.get('id_medicamento')
        id_sede = data.get('id_sede')
        stock = data.get('stock')
        estado = data.get('estado')
        
        # Validar campos requeridos
        if not all([id_medicamento, id_sede, stock is not None, estado]):
            return jsonify({'error': 'Los campos id_medicamento, id_sede, stock y estado son requeridos'}), 400
        
        disponibilidad, error = DispService.create_disponibilidad(
            id_medicamento=id_medicamento,
            id_sede=id_sede,
            stock=stock,
            estado=estado
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se crea disponibilidad
        socketio.emit('disponibilidad_creada', disponibilidad, namespace='/')
        
        return jsonify(disponibilidad), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad', methods=['GET'])
@token_required
def get_disponibilidad():
    """Obtener todas las disponibilidades"""
    try:
        disponibilidades, error = DispService.get_all_disponibilidad()
        if error:
            return jsonify({'error': error}), 400
        return jsonify(disponibilidades), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/<int:disponibilidad_id>', methods=['GET'])
@token_required
def get_disponibilidad_by_id(disponibilidad_id):
    """Obtener disponibilidad por ID"""
    try:
        disponibilidad, error = DispService.get_disponibilidad_by_id(disponibilidad_id)
        if error:
            return jsonify({'error': error}), 404
        return jsonify(disponibilidad), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/sede/<int:sede_id>', methods=['GET'])
@token_required
def get_disponibilidad_by_sede(sede_id):
    """Obtener disponibilidades por sede"""
    try:
        disponibilidades, error = DispService.get_disponibilidad_by_sede(sede_id)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(disponibilidades), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/medicamento/<int:medicamento_id>', methods=['GET'])
@token_required
def get_disponibilidad_by_medicamento(medicamento_id):
    """Obtener disponibilidades por medicamento"""
    try:
        disponibilidades, error = DispService.get_disponibilidad_by_medicamento(medicamento_id)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(disponibilidades), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/medicamento/<int:medicamento_id>/sede/<int:sede_id>', methods=['GET'])
@token_required
def get_disponibilidad_by_medicamento_sede(medicamento_id, sede_id):
    """Obtener disponibilidad específica por medicamento y sede"""
    try:
        disponibilidad, error = DispService.get_disponibilidad_by_medicamento_sede(medicamento_id, sede_id)
        if error:
            return jsonify({'error': error}), 404
        return jsonify(disponibilidad), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/medicamentos-disponibles/sede/<int:sede_id>', methods=['GET'])
@token_required
def get_medicamentos_disponibles_en_sede(sede_id):
    """Obtener medicamentos disponibles en una sede específica"""
    try:
        disponibilidades, error = DispService.get_medicamentos_disponibles_en_sede(sede_id)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(disponibilidades), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/sedes-con-medicamento/<int:medicamento_id>', methods=['GET'])
@token_required
def get_sedes_con_medicamento(medicamento_id):
    """Obtener sedes que tienen disponible un medicamento específico"""
    try:
        disponibilidades, error = DispService.get_sedes_con_medicamento(medicamento_id)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(disponibilidades), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/stock-bajo', methods=['GET'])
@token_required
def get_stock_bajo():
    """Obtener disponibilidades con stock bajo"""
    try:
        # Obtener límite del query parameter (por defecto 10)
        limite = int(request.args.get('limite', 10))
        
        disponibilidades, error = DispService.get_disponibilidad_stock_bajo(limite)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(disponibilidades), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/agotados', methods=['GET'])
@token_required
def get_medicamentos_agotados():
    """Obtener medicamentos agotados"""
    try:
        disponibilidades, error = DispService.get_disponibilidad_agotadas()
        if error:
            return jsonify({'error': error}), 400
        return jsonify(disponibilidades), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/estado/<string:estado>', methods=['GET'])
@token_required
def get_disponibilidad_by_estado(estado):
    """Obtener disponibilidades por estado"""
    try:
        # Validar que el estado sea válido
        estados_validos = ['disponible', 'poco_stock', 'agotado']
        if estado not in estados_validos:
            return jsonify({'error': f'Estado inválido. Estados válidos: {estados_validos}'}), 400
        
        disponibilidades, error = DispService.get_disponibilidad_by_estado(estado)
        if error:
            return jsonify({'error': error}), 400
        return jsonify(disponibilidades), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/search', methods=['GET'])
@token_required
def search_disponibilidad():
    """Buscar disponibilidades por múltiples criterios"""
    try:
        # Obtener parámetros de búsqueda
        medicamento_nombre = request.args.get('medicamento', '').strip()
        sede_nombre = request.args.get('sede', '').strip()
        estado = request.args.get('estado', '').strip()
        
        if not any([medicamento_nombre, sede_nombre, estado]):
            return jsonify({'error': 'Se debe proporcionar al menos un parámetro de búsqueda'}), 400
        
        disponibilidades, error = DispService.search_disponibilidad(medicamento_nombre, sede_nombre, estado)
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify(disponibilidades), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/resumen', methods=['GET'])
@token_required
def get_resumen_disponibilidad():
    """Obtener resumen general de disponibilidad"""
    try:
        resumen, error = DispService.get_resumen_disponibilidad()
        if error:
            return jsonify({'error': error}), 400
        return jsonify(resumen), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/<int:disponibilidad_id>', methods=['PUT'])
@token_required
def update_disponibilidad(disponibilidad_id):
    """Actualizar disponibilidad (solo admin)"""
    try:
        # Verificar que el usuario sea admin
        if request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'Acceso denegado. Se requieren permisos de administrador'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        disponibilidad, error = DispService.update_disponibilidad(disponibilidad_id, data)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se actualiza disponibilidad
        socketio.emit('disponibilidad_actualizada', disponibilidad, namespace='/')
        
        return jsonify(disponibilidad), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/<int:disponibilidad_id>/ajustar-stock', methods=['PUT'])
@token_required
def ajustar_stock(disponibilidad_id):
    """Ajustar stock de disponibilidad (solo admin)"""
    try:
        # Verificar que el usuario sea admin
        if request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'Acceso denegado. Se requieren permisos de administrador'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        cantidad = data.get('cantidad')
        if cantidad is None:
            return jsonify({'error': 'El campo cantidad es requerido'}), 400
        
        try:
            cantidad = int(cantidad)
        except ValueError:
            return jsonify({'error': 'La cantidad debe ser un número entero'}), 400
        
        disponibilidad, error = DispService.ajustar_stock(disponibilidad_id, cantidad)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se ajusta stock
        socketio.emit('disponibilidad_actualizada', disponibilidad, namespace='/')
        socketio.emit('stock_ajustado', {
            'disponibilidad_id': disponibilidad_id,
            'cantidad_ajustada': cantidad,
            'stock_anterior': disponibilidad['stock'] - cantidad,
            'stock_nuevo': disponibilidad['stock']
        }, namespace='/')
        
        return jsonify(disponibilidad), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/<int:disponibilidad_id>', methods=['DELETE'])
@token_required
def delete_disponibilidad(disponibilidad_id):
    """Eliminar disponibilidad (solo admin)"""
    try:
        # Verificar que el usuario sea admin
        if request.current_user.get('rol') != 'admin':
            return jsonify({'error': 'Acceso denegado. Se requieren permisos de administrador'}), 403
        
        success, error = DispService.delete_disponibilidad(disponibilidad_id)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir evento de WebSocket cuando se elimina disponibilidad
        socketio.emit('disponibilidad_eliminada', {'id': disponibilidad_id}, namespace='/')
        
        return jsonify({'message': 'Disponibilidad eliminada correctamente'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Rutas específicas para notificaciones en tiempo real
@disp_routes.route('/disponibilidad/alertas/stock-bajo', methods=['GET'])
@token_required
def get_alertas_stock_bajo():
    """Obtener alertas de stock bajo para notificaciones en tiempo real"""
    try:
        limite = int(request.args.get('limite', 5))  # Stock crítico por defecto: 5 unidades
        
        disponibilidades, error = DispService.get_disponibilidad_stock_bajo(limite)
        if error:
            return jsonify({'error': error}), 400
        
        # Formatear para alertas
        alertas = []
        for disp in disponibilidades:
            alertas.append({
                'id': disp['id'],
                'medicamento': disp['medicamento']['nombreMedicamento'],
                'sede': disp['sede']['nombreSede'],
                'stock_actual': disp['stock'],
                'estado': disp['estado'],
                'criticidad': 'alta' if disp['stock'] <= 2 else 'media',
                'mensaje': f"Stock bajo de {disp['medicamento']['nombreMedicamento']} en {disp['sede']['nombreSede']}: {disp['stock']} unidades restantes"
            })
        
        return jsonify(alertas), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disp_routes.route('/disponibilidad/notificar-consumo', methods=['POST'])
@token_required
def notificar_consumo():
    """Notificar consumo de medicamento y actualizar stock"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        disponibilidad_id = data.get('disponibilidad_id')
        cantidad_consumida = data.get('cantidad')
        
        if not disponibilidad_id or cantidad_consumida is None:
            return jsonify({'error': 'Los campos disponibilidad_id y cantidad son requeridos'}), 400
        
        try:
            cantidad_consumida = int(cantidad_consumida)
        except ValueError:
            return jsonify({'error': 'La cantidad debe ser un número entero'}), 400
        
        if cantidad_consumida <= 0:
            return jsonify({'error': 'La cantidad debe ser mayor a cero'}), 400
        
        # Ajustar stock (restar cantidad consumida)
        disponibilidad, error = DispService.ajustar_stock(disponibilidad_id, -cantidad_consumida)
        if error:
            return jsonify({'error': error}), 400
        
        # Emitir eventos de WebSocket
        socketio.emit('medicamento_consumido', {
            'disponibilidad_id': disponibilidad_id,
            'cantidad_consumida': cantidad_consumida,
            'stock_restante': disponibilidad['stock'],
            'medicamento': disponibilidad['medicamento']['nombreMedicamento'],
            'sede': disponibilidad['sede']['nombreSede'],
            'estado': disponibilidad['estado']
        }, namespace='/')
        
        socketio.emit('disponibilidad_actualizada', disponibilidad, namespace='/')
        
        # Si el stock es crítico, enviar alerta
        if disponibilidad['stock'] <= 5:
            socketio.emit('alerta_stock_bajo', {
                'disponibilidad_id': disponibilidad_id,
                'medicamento': disponibilidad['medicamento']['nombreMedicamento'],
                'sede': disponibilidad['sede']['nombreSede'],
                'stock_actual': disponibilidad['stock'],
                'criticidad': 'alta' if disponibilidad['stock'] <= 2 else 'media'
            }, namespace='/')
        
        return jsonify({
            'message': 'Consumo registrado correctamente',
            'disponibilidad': disponibilidad
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500