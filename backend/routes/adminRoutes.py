from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from services.userService import UserService
from services.sedeService import SedeService
from services.medService import MedService
from functools import wraps
from socketsExtends import socketio  

admin_routes = Blueprint('admin_routes', __name__)

# ------------------------------------------------------------------------------
# Rutas para USUARIOS
# ------------------------------------------------------------------------------

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_user' not in session:
            return redirect(url_for('admin_routes.login'))
        
        # Verificar que el usuario sigue siendo admin
        user, error = UserService.get_user_by_id(session['admin_user']['id'])
        if error or not user or user['rol'] != 'admin':
            session.pop('admin_user', None)
            flash('Acceso no autorizado', 'error')
            return redirect(url_for('admin_routes.login'))
        
        return f(*args, **kwargs)
    return decorated_function

@admin_routes.route('/')
def index():
    if 'admin_user' in session:
        return redirect(url_for('admin_routes.dashboard'))
    return redirect(url_for('admin_routes.login'))

@admin_routes.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        dni = request.form.get('dni')
        password = request.form.get('password')
        
        if not dni or not password:
            flash('DNI y contraseña son requeridos', 'error')
            return render_template('admin/login.html')
        
        user, error = UserService.authenticate_user(dni, password)
        
        if error:
            flash('Credenciales inválidas', 'error')
            return render_template('admin/login.html')
        
        if user['rol'] != 'admin':
            flash('Acceso denegado. Solo administradores pueden acceder.', 'error')
            return render_template('admin/login.html')
        
        session['admin_user'] = user
        return redirect(url_for('admin_routes.dashboard'))
    
    return render_template('admin/login.html')

@admin_routes.route('/logout')
def logout():
    session.pop('admin_user', None)
    flash('Sesión cerrada correctamente', 'success')
    return redirect(url_for('admin_routes.login'))

@admin_routes.route('/dashboard')
@admin_required
def dashboard():
    # Obtener estadísticas de usuarios
    users, error = UserService.get_all_users()
    total_users = len(users) if users else 0
    admin_users = len([u for u in users if u.get('rol') == 'admin']) if users else 0
    regular_users = total_users - admin_users
    
    # Obtener estadísticas de medicamentos
    medicamentos, error_med = MedService.get_all_medicamentos()
    total_medicamentos = len(medicamentos) if medicamentos else 0
    
    # Obtener estadísticas de sedes
    sedes, error_sede = SedeService.get_all_sedes()
    total_sedes = len(sedes) if sedes else 0
    
    # Estadísticas simplificadas
    stats = {
        'total_users': total_users,
        'admin_users': admin_users,
        'regular_users': regular_users,
        'total_medicamentos': total_medicamentos,
        'total_sedes': total_sedes
    }
    
    return render_template('admin/dashboard.html', stats=stats)

@admin_routes.route('/users')
@admin_required
def users():
    users, error = UserService.get_all_users()
    if error:
        flash(f'Error al cargar usuarios: {error}', 'error')
        users = []
    
    return render_template('admin/users/users.html', users=users)

@admin_routes.route('/users/add', methods=['GET', 'POST'])
@admin_required
def add_user():
    if request.method == 'POST':
        nombre = request.form.get('nombre')
        apellidos = request.form.get('apellidos')
        dni = request.form.get('dni')
        telefono = request.form.get('telefono')
        password = request.form.get('password')
        rol = request.form.get('rol', 'user')
        
        if not all([nombre, apellidos, dni, telefono, password]):
            flash('Todos los campos son requeridos', 'error')
            return render_template('admin/users/add_user.html')
        
        user, error = UserService.create_user(nombre, apellidos, dni, telefono, password, rol)
        
        if error:
            flash(f'Error al crear usuario: {error}', 'error')
            return render_template('admin/users/add_user.html')
        
        # Emitir evento de WebSocket cuando se crea un usuario desde admin
        socketio.emit('usuario_creado', user, namespace='/')
        
        flash('Usuario creado correctamente', 'success')
        return redirect(url_for('admin_routes.users'))
    
    return render_template('admin/users/add_user.html')

@admin_routes.route('/users/<int:user_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_user(user_id):
    user, error = UserService.get_user_by_id(user_id)
    if error:
        flash(f'Usuario no encontrado: {error}', 'error')
        return redirect(url_for('admin_routes.users'))
    
    if request.method == 'POST':
        data = {
            'nombre': request.form.get('nombre'),
            'apellidos': request.form.get('apellidos'),
            'dni': request.form.get('dni'),
            'telefono': request.form.get('telefono'),
            'rol': request.form.get('rol')
        }
        
        # Solo actualizar contraseña si se proporciona
        password = request.form.get('password')
        if password and password.strip():
            data['password'] = password
        
        updated_user, error = UserService.update_user(user_id, data)
        
        if error:
            flash(f'Error al actualizar usuario: {error}', 'error')
            return render_template('admin/users/edit_user.html', user=user)
        
        # Emitir evento de WebSocket cuando se actualiza un usuario desde admin
        socketio.emit('usuario_actualizado', updated_user, namespace='/')
        
        flash('Usuario actualizado correctamente', 'success')
        return redirect(url_for('admin_routes.users'))
    
    return render_template('admin/users/edit_user.html', user=user)

@admin_routes.route('/users/<int:user_id>/delete', methods=['POST'])
@admin_required
def delete_user(user_id):
    # Evitar que el admin se elimine a sí mismo
    if user_id == session['admin_user']['id']:
        flash('No puedes eliminarte a ti mismo', 'error')
        return redirect(url_for('admin_routes.users'))
    
    success, error = UserService.delete_user(user_id)
    
    if error:
        flash(f'Error al eliminar usuario: {error}', 'error')
    else:
        # Emitir evento de WebSocket cuando se elimina un usuario desde admin
        socketio.emit('usuario_eliminado', {'id': user_id}, namespace='/')
        flash('Usuario eliminado correctamente', 'success')
    
    return redirect(url_for('admin_routes.users'))

# ------------------------------------------------------------------------------
# Rutas para las SEDES 
# ------------------------------------------------------------------------------

@admin_routes.route('/sedes')
@admin_required
def sedes():
    sedes, error = SedeService.get_all_sedes()
    if error:
        flash(f'Error al cargar sedes: {error}', 'error')
        sedes = []
    
    return render_template('admin/sedes/sedes.html', sedes=sedes)

@admin_routes.route('/sedes/add', methods=['GET', 'POST'])
@admin_required
def add_sede():
    if request.method == 'POST':
        nombreSede = request.form.get('nombreSede')
        ciudad = request.form.get('ciudad')
        ubicacion = request.form.get('ubicacion')
        
        if not all([nombreSede, ciudad, ubicacion]):
            flash('Todos los campos son requeridos', 'error')
            return render_template('admin/sedes/add_sede.html')
        
        sede, error = SedeService.create_sede(nombreSede, ciudad, ubicacion)
        
        if error:
            flash(f'Error al crear sede: {error}', 'error')
            return render_template('admin/sedes/add_sede.html')
        
        flash('Sede creada correctamente', 'success')
        return redirect(url_for('admin_routes.sedes'))
    
    return render_template('admin/sedes/add_sede.html')

@admin_routes.route('/sedes/<int:sede_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_sede(sede_id):
    sede, error = SedeService.get_sede_by_id(sede_id)
    if error:
        flash(f'Sede no encontrada: {error}', 'error')
        return redirect(url_for('admin_routes.sedes'))
    
    if request.method == 'POST':
        data = {
            'nombreSede': request.form.get('nombreSede'),
            'ciudad': request.form.get('ciudad'),
            'ubicacion': request.form.get('ubicacion')
        }
        
        updated_sede, error = SedeService.update_sede(sede_id, data)
        
        if error:
            flash(f'Error al actualizar sede: {error}', 'error')
            return render_template('admin/sedes/edit_sede.html', sede=sede)
        
        flash('Sede actualizada correctamente', 'success')
        return redirect(url_for('admin_routes.sedes'))
    
    return render_template('admin/sedes/edit_sede.html', sede=sede)

@admin_routes.route('/sedes/<int:sede_id>/delete', methods=['POST'])
@admin_required
def delete_sede(sede_id):
    success, error = SedeService.delete_sede(sede_id)
    
    if error:
        flash(f'Error al eliminar sede: {error}', 'error')
    else:
        flash('Sede eliminada correctamente', 'success')
    
    return redirect(url_for('admin_routes.sedes'))

# ------------------------------------------------------------------------------
# Rutas para MEDICAMENTOS 
# ------------------------------------------------------------------------------

@admin_routes.route('/medicamentos')
@admin_required
def medicamentos():
    from services.medService import MedService
    medicamentos, error = MedService.get_all_medicamentos()
    if error:
        flash(f'Error al cargar medicamentos: {error}', 'error')
        medicamentos = []
    
    return render_template('admin/medicamentos/medicamentos.html', medicamentos=medicamentos)

@admin_routes.route('/medicamentos/add', methods=['GET', 'POST'])
@admin_required
def add_medicamento():
    from services.medService import MedService
    
    if request.method == 'POST':
        nombreMedicamento = request.form.get('nombreMedicamento')
        tipo = request.form.get('tipo')
        referencia = request.form.get('referencia')
        descripcion = request.form.get('descripcion')
        foto = request.files.get('foto')
        
        if not all([nombreMedicamento, tipo, referencia]):
            flash('Los campos Nombre del Medicamento, Tipo y Referencia son requeridos', 'error')
            return render_template('admin/medicamentos/add_medicamento.html')
        
        # Verificar si se subió una foto pero está vacía
        if foto and foto.filename == '':
            foto = None
        
        medicamento, error = MedService.create_medicamento(
            nombre_medicamento=nombreMedicamento,
            tipo=tipo,
            referencia=referencia,
            descripcion=descripcion,
            foto=foto
        )
        
        if error:
            flash(f'Error al crear medicamento: {error}', 'error')
            return render_template('admin/medicamentos/add_medicamento.html')
        
        # Emitir evento de WebSocket cuando se crea un medicamento desde admin
        socketio.emit('medicamento_creado', medicamento, namespace='/')
        
        flash('Medicamento creado correctamente', 'success')
        return redirect(url_for('admin_routes.medicamentos'))
    
    return render_template('admin/medicamentos/add_medicamento.html')

@admin_routes.route('/medicamentos/<int:medicamento_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_medicamento(medicamento_id):
    from services.medService import MedService
    
    medicamento, error = MedService.get_medicamento_by_id(medicamento_id)
    if error:
        flash(f'Medicamento no encontrado: {error}', 'error')
        return redirect(url_for('admin_routes.medicamentos'))
    
    if request.method == 'POST':
        data = {
            'nombreMedicamento': request.form.get('nombreMedicamento'),
            'tipo': request.form.get('tipo'),
            'referencia': request.form.get('referencia'),
            'descripcion': request.form.get('descripcion')
        }
        
        # Obtener la foto si se subió una nueva
        foto = request.files.get('foto')
        if foto and foto.filename == '':
            foto = None
        
        updated_medicamento, error = MedService.update_medicamento(medicamento_id, data, foto)
        
        if error:
            flash(f'Error al actualizar medicamento: {error}', 'error')
            return render_template('admin/medicamentos/edit_medicamento.html', medicamento=medicamento)
        
        # Emitir evento de WebSocket cuando se actualiza un medicamento desde admin
        socketio.emit('medicamento_actualizado', updated_medicamento, namespace='/')
        
        flash('Medicamento actualizado correctamente', 'success')
        return redirect(url_for('admin_routes.medicamentos'))
    
    return render_template('admin/medicamentos/edit_medicamento.html', medicamento=medicamento)

@admin_routes.route('/medicamentos/<int:medicamento_id>/delete', methods=['POST'])
@admin_required
def delete_medicamento(medicamento_id):
    from services.medService import MedService
    
    success, error = MedService.delete_medicamento(medicamento_id)
    
    if error:
        flash(f'Error al eliminar medicamento: {error}', 'error')
    else:
        # Emitir evento de WebSocket cuando se elimina un medicamento desde admin
        socketio.emit('medicamento_eliminado', {'id': medicamento_id}, namespace='/')
        flash('Medicamento eliminado correctamente', 'success')
    
    return redirect(url_for('admin_routes.medicamentos'))

@admin_routes.route('/medicamentos/<int:medicamento_id>/view')
@admin_required
def view_medicamento(medicamento_id):
    from services.medService import MedService
    
    medicamento, error = MedService.get_medicamento_by_id(medicamento_id)
    if error:
        flash(f'Medicamento no encontrado: {error}', 'error')
        return redirect(url_for('admin_routes.medicamentos'))
    
    return render_template('admin/medicamentos/view_medicamento.html', medicamento=medicamento)

@admin_routes.route('/medicamentos/search', methods=['GET', 'POST'])
@admin_required
def search_medicamentos():
    from services.medService import MedService
    
    medicamentos = []
    search_performed = False
    
    if request.method == 'POST':
        nombre = request.form.get('nombre', '').strip()
        tipo = request.form.get('tipo', '').strip()
        referencia = request.form.get('referencia', '').strip()
        
        if any([nombre, tipo, referencia]):
            medicamentos, error = MedService.search_medicamentos(nombre, tipo, referencia)
            if error:
                flash(f'Error en la búsqueda: {error}', 'error')
                medicamentos = []
            else:
                search_performed = True
                if not medicamentos:
                    flash('No se encontraron medicamentos con los criterios especificados', 'info')
        else:
            flash('Debe ingresar al menos un criterio de búsqueda', 'warning')
    
    return render_template('admin/medicamentos/search_medicamentos.html', 
                         medicamentos=medicamentos, 
                         search_performed=search_performed)

@admin_routes.route('/medicamentos/tipos')
@admin_required
def tipos_medicamentos():
    from services.medService import MedService
    
    tipos, error = MedService.get_tipos_disponibles()
    if error:
        flash(f'Error al cargar tipos: {error}', 'error')
        tipos = []
    
    # Obtener estadísticas por tipo
    medicamentos_por_tipo = {}
    if tipos:
        for tipo in tipos:
            meds, error = MedService.get_medicamentos_by_tipo(tipo)
            if not error:
                medicamentos_por_tipo[tipo] = len(meds)
    
    return render_template('admin/medicamentos/tipos_medicamentos.html', 
                         tipos=tipos, 
                         medicamentos_por_tipo=medicamentos_por_tipo)

@admin_routes.route('/medicamentos/tipo/<string:tipo>')
@admin_required
def medicamentos_by_tipo(tipo):
    from services.medService import MedService
    
    medicamentos, error = MedService.get_medicamentos_by_tipo(tipo)
    if error:
        flash(f'Error al cargar medicamentos por tipo: {error}', 'error')
        medicamentos = []
    
    return render_template('admin/medicamentos/medicamentos_by_tipo.html', 
                         medicamentos=medicamentos, 
                         tipo=tipo)

@admin_routes.route('/medicamentos/bulk-delete', methods=['POST'])
@admin_required
def bulk_delete_medicamentos():
    from services.medService import MedService
    
    medicamento_ids = request.form.getlist('medicamento_ids')
    
    if not medicamento_ids:
        flash('No se seleccionaron medicamentos para eliminar', 'warning')
        return redirect(url_for('admin_routes.medicamentos'))
    
    deleted_count = 0
    errors = []
    
    for med_id in medicamento_ids:
        try:
            success, error = MedService.delete_medicamento(int(med_id))
            if success:
                deleted_count += 1
                # Emitir evento de WebSocket para cada medicamento eliminado
                socketio.emit('medicamento_eliminado', {'id': int(med_id)}, namespace='/')
            else:
                errors.append(f'Medicamento ID {med_id}: {error}')
        except ValueError:
            errors.append(f'ID inválido: {med_id}')
        except Exception as e:
            errors.append(f'Error con medicamento ID {med_id}: {str(e)}')
    
    if deleted_count > 0:
        flash(f'{deleted_count} medicamento(s) eliminado(s) correctamente', 'success')
    
    if errors:
        for error in errors:
            flash(error, 'error')
    
    return redirect(url_for('admin_routes.medicamentos'))

# ------------------------------------------------------------------------------
# Rutas para DISPONIBILIDAD 
# ------------------------------------------------------------------------------

@admin_routes.route('/disponibilidad')
@admin_required
def disponibilidad():
    from services.dispService import DispService
    from services.sedeService import SedeService
    
    # Obtener filtros de la URL
    sede_filter = request.args.get('sede_filter', '')
    estado_filter = request.args.get('estado_filter', '')
    medicamento_search = request.args.get('medicamento_search', '')
    
    # Obtener todas las disponibilidades
    disponibilidades, error = DispService.get_all_disponibilidad()
    if error:
        flash(f'Error al cargar disponibilidades: {error}', 'error')
        disponibilidades = []
    
    # Aplicar filtros
    if disponibilidades:
        if sede_filter:
            disponibilidades = [d for d in disponibilidades if d['id_sede'] == int(sede_filter)]
        
        if estado_filter:
            disponibilidades = [d for d in disponibilidades if d['estado'] == estado_filter]
        
        if medicamento_search:
            medicamento_search_lower = medicamento_search.lower()
            disponibilidades = [d for d in disponibilidades 
                              if medicamento_search_lower in d['medicamento']['nombreMedicamento'].lower()]
    
    # Obtener sedes para el filtro
    sedes, error = SedeService.get_all_sedes()
    if error:
        flash(f'Error al cargar sedes: {error}', 'error')
        sedes = []
    
    return render_template('admin/disponibilidad/disponibilidad.html', 
                         disponibilidades=disponibilidades, 
                         sedes=sedes)

@admin_routes.route('/disponibilidad/add', methods=['GET', 'POST'])
@admin_required
def add_disponibilidad():
    from services.dispService import DispService
    from services.medService import MedService
    from services.sedeService import SedeService
    
    if request.method == 'POST':
        id_medicamento = request.form.get('id_medicamento')
        id_sede = request.form.get('id_sede')
        stock = request.form.get('stock')
        estado = request.form.get('estado')
        
        if not all([id_medicamento, id_sede, stock, estado]):
            flash('Todos los campos son requeridos', 'error')
            return redirect(url_for('admin_routes.add_disponibilidad'))
        
        try:
            # Verificar si ya existe una disponibilidad para esta combinación
            existing, _ = DispService.get_disponibilidad_by_medicamento_sede(
                int(id_medicamento), int(id_sede)
            )
            
            if existing:
                flash('Ya existe un registro de disponibilidad para esta combinación de medicamento y sede', 'error')
                return redirect(url_for('admin_routes.add_disponibilidad'))
            
            disponibilidad, error = DispService.create_disponibilidad(
                id_medicamento=int(id_medicamento),
                id_sede=int(id_sede),
                stock=int(stock),
                estado=estado
            )
            
            if error:
                flash(f'Error al crear disponibilidad: {error}', 'error')
                return redirect(url_for('admin_routes.add_disponibilidad'))
            
            # Emitir evento de WebSocket cuando se crea disponibilidad desde admin
            socketio.emit('disponibilidad_creada', disponibilidad, namespace='/')
            
            flash('Disponibilidad creada correctamente', 'success')
            return redirect(url_for('admin_routes.disponibilidad'))
            
        except ValueError as e:
            flash(f'Error en los datos proporcionados: {str(e)}', 'error')
            return redirect(url_for('admin_routes.add_disponibilidad'))
        except Exception as e:
            flash(f'Error inesperado: {str(e)}', 'error')
            return redirect(url_for('admin_routes.add_disponibilidad'))
    
    # GET request - mostrar formulario
    medicamentos, error = MedService.get_all_medicamentos()
    if error:
        flash(f'Error al cargar medicamentos: {error}', 'error')
        medicamentos = []
    
    sedes, error = SedeService.get_all_sedes()
    if error:
        flash(f'Error al cargar sedes: {error}', 'error')
        sedes = []
    
    return render_template('admin/disponibilidad/add_disponibilidad.html', 
                         medicamentos=medicamentos, 
                         sedes=sedes)

@admin_routes.route('/disponibilidad/<int:disponibilidad_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_disponibilidad(disponibilidad_id):
    from services.dispService import DispService
    
    disponibilidad, error = DispService.get_disponibilidad_by_id(disponibilidad_id)
    if error:
        flash(f'Disponibilidad no encontrada: {error}', 'error')
        return redirect(url_for('admin_routes.disponibilidad'))
    
    if request.method == 'POST':
        stock = request.form.get('stock')
        estado = request.form.get('estado')
        
        if not all([stock, estado]):
            flash('Todos los campos son requeridos', 'error')
            return render_template('admin/disponibilidad/edit_disponibilidad.html', 
                                 disponibilidad=disponibilidad)
        
        try:
            data = {
                'stock': int(stock),
                'estado': estado
            }
            
            updated_disponibilidad, error = DispService.update_disponibilidad(disponibilidad_id, data)
            
            if error:
                flash(f'Error al actualizar disponibilidad: {error}', 'error')
                return render_template('admin/disponibilidad/edit_disponibilidad.html', 
                                     disponibilidad=disponibilidad)
            
            # Emitir evento de WebSocket cuando se actualiza disponibilidad desde admin
            socketio.emit('disponibilidad_actualizada', updated_disponibilidad, namespace='/')
            
            flash('Disponibilidad actualizada correctamente', 'success')
            return redirect(url_for('admin_routes.disponibilidad'))
            
        except ValueError as e:
            flash(f'Error en los datos proporcionados: {str(e)}', 'error')
            return render_template('admin/disponibilidad/edit_disponibilidad.html', 
                                 disponibilidad=disponibilidad)
        except Exception as e:
            flash(f'Error inesperado: {str(e)}', 'error')
            return render_template('admin/disponibilidad/edit_disponibilidad.html', 
                                 disponibilidad=disponibilidad)
    
    return render_template('admin/disponibilidad/edit_disponibilidad.html', 
                         disponibilidad=disponibilidad)

@admin_routes.route('/disponibilidad/<int:disponibilidad_id>/delete', methods=['POST'])
@admin_required
def delete_disponibilidad(disponibilidad_id):
    from services.dispService import DispService
    
    success, error = DispService.delete_disponibilidad(disponibilidad_id)
    
    if error:
        flash(f'Error al eliminar disponibilidad: {error}', 'error')
    else:
        # Emitir evento de WebSocket cuando se elimina disponibilidad desde admin
        socketio.emit('disponibilidad_eliminada', {'id': disponibilidad_id}, namespace='/')
        flash('Disponibilidad eliminada correctamente', 'success')
    
    return redirect(url_for('admin_routes.disponibilidad'))

@admin_routes.route('/disponibilidad/<int:disponibilidad_id>/view')
@admin_required
def view_disponibilidad(disponibilidad_id):
    from services.dispService import DispService
    
    disponibilidad, error = DispService.get_disponibilidad_by_id(disponibilidad_id)
    if error:
        flash(f'Disponibilidad no encontrada: {error}', 'error')
        return redirect(url_for('admin_routes.disponibilidad'))
    
    return render_template('admin/disponibilidad/view_disponibilidad.html', 
                         disponibilidad=disponibilidad)

@admin_routes.route('/disponibilidad/sede/<int:sede_id>')
@admin_required
def disponibilidad_by_sede(sede_id):
    from services.dispService import DispService
    from services.sedeService import SedeService
    
    # Obtener información de la sede
    sede, error = SedeService.get_sede_by_id(sede_id)
    if error:
        flash(f'Sede no encontrada: {error}', 'error')
        return redirect(url_for('admin_routes.disponibilidad'))
    
    # Obtener disponibilidades de la sede
    disponibilidades, error = DispService.get_disponibilidad_by_sede(sede_id)
    if error:
        flash(f'Error al cargar disponibilidades de la sede: {error}', 'error')
        disponibilidades = []
    
    return render_template('admin/disponibilidad/disponibilidad_by_sede.html', 
                         disponibilidades=disponibilidades, 
                         sede=sede)

@admin_routes.route('/disponibilidad/medicamento/<int:medicamento_id>')
@admin_required
def disponibilidad_by_medicamento(medicamento_id):
    from services.dispService import DispService
    from services.medService import MedService
    
    # Obtener información del medicamento
    medicamento, error = MedService.get_medicamento_by_id(medicamento_id)
    if error:
        flash(f'Medicamento no encontrado: {error}', 'error')
        return redirect(url_for('admin_routes.disponibilidad'))
    
    # Obtener disponibilidades del medicamento
    disponibilidades, error = DispService.get_disponibilidad_by_medicamento(medicamento_id)
    if error:
        flash(f'Error al cargar disponibilidades del medicamento: {error}', 'error')
        disponibilidades = []
    
    return render_template('admin/disponibilidad/disponibilidad_by_medicamento.html', 
                         disponibilidades=disponibilidades, 
                         medicamento=medicamento)

@admin_routes.route('/disponibilidad/stock-bajo')
@admin_required
def stock_bajo():
    from services.dispService import DispService
    
    # Obtener disponibilidades con stock bajo (<=10 unidades)
    disponibilidades, error = DispService.get_disponibilidad_stock_bajo(10)
    if error:
        flash(f'Error al cargar disponibilidades con stock bajo: {error}', 'error')
        disponibilidades = []
    
    return render_template('admin/disponibilidad/stock_bajo.html', 
                         disponibilidades=disponibilidades)

@admin_routes.route('/disponibilidad/agotados')
@admin_required
def medicamentos_agotados():
    from services.dispService import DispService
    
    # Obtener disponibilidades agotadas (stock = 0)
    disponibilidades, error = DispService.get_disponibilidad_agotadas()
    if error:
        flash(f'Error al cargar medicamentos agotados: {error}', 'error')
        disponibilidades = []
    
    return render_template('admin/disponibilidad/agotados.html', 
                         disponibilidades=disponibilidades)

@admin_routes.route('/disponibilidad/bulk-update', methods=['POST'])
@admin_required
def bulk_update_disponibilidad():
    from services.dispService import DispService
    
    disponibilidad_ids = request.form.getlist('disponibilidad_ids')
    accion = request.form.get('accion')
    valor = request.form.get('valor', '')
    
    if not disponibilidad_ids:
        flash('No se seleccionaron registros para actualizar', 'warning')
        return redirect(url_for('admin_routes.disponibilidad'))
    
    if not accion:
        flash('No se especificó una acción', 'warning')
        return redirect(url_for('admin_routes.disponibilidad'))
    
    updated_count = 0
    errors = []
    
    for disp_id in disponibilidad_ids:
        try:
            if accion == 'cambiar_estado' and valor:
                data = {'estado': valor}
                updated_disp, error = DispService.update_disponibilidad(int(disp_id), data)
                
                if updated_disp:
                    updated_count += 1
                    # Emitir evento de WebSocket para cada actualización
                    socketio.emit('disponibilidad_actualizada', updated_disp, namespace='/')
                else:
                    errors.append(f'Disponibilidad ID {disp_id}: {error}')
                    
            elif accion == 'ajustar_stock' and valor:
                # Obtener disponibilidad actual
                current_disp, error = DispService.get_disponibilidad_by_id(int(disp_id))
                if error:
                    errors.append(f'Disponibilidad ID {disp_id}: {error}')
                    continue
                
                nuevo_stock = max(0, current_disp['stock'] + int(valor))
                nuevo_estado = 'agotado' if nuevo_stock == 0 else ('poco_stock' if nuevo_stock <= 10 else 'disponible')
                
                data = {
                    'stock': nuevo_stock,
                    'estado': nuevo_estado
                }
                
                updated_disp, error = DispService.update_disponibilidad(int(disp_id), data)
                
                if updated_disp:
                    updated_count += 1
                    # Emitir evento de WebSocket para cada actualización
                    socketio.emit('disponibilidad_actualizada', updated_disp, namespace='/')
                else:
                    errors.append(f'Disponibilidad ID {disp_id}: {error}')
                    
        except ValueError:
            errors.append(f'ID inválido: {disp_id}')
        except Exception as e:
            errors.append(f'Error con disponibilidad ID {disp_id}: {str(e)}')
    
    if updated_count > 0:
        flash(f'{updated_count} registro(s) actualizados correctamente', 'success')
    
    if errors:
        for error in errors:
            flash(error, 'error')
    
    return redirect(url_for('admin_routes.disponibilidad'))