from flask import Flask
from flask_cors import CORS
from config.connection import get_db_connection
from models.userModel import User
from routes.userRoutes import user_routes
from models.sedeModel import Sede
from models.medModel import Medicamentos
from routes.medRoutes import med_routes
from models.dispModel import Disponibilidad
from routes.dispRoutes import disp_routes
from models.recoleccionModel import Recoleccion
from routes.recoleccionRoutes import recoleccion_routes
from models.favModel import Favoritos
from routes.favRoutes import favoritos_routes
from socketsExtends import socketio  
from routes.adminRoutes import admin_routes
from services.reminderService import reminder_service
import os, logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Configurar base de datos
    db = get_db_connection(app)
    
    # Inicializar SocketIO con la app
    socketio.init_app(app)
    
    # Registrar blueprints
    app.register_blueprint(user_routes, url_prefix='/api') #Para acceso a rutas de API usuarios
    app.register_blueprint(med_routes, url_prefix='/api')  # Para acceso a rutas de API medicamentos
    app.register_blueprint(disp_routes, url_prefix='/api')  # Para acceso a rutas de API Disponibilidades
    app.register_blueprint(recoleccion_routes, url_prefix='/api')  # Para acceso a rutas de API Recolecciones
    app.register_blueprint(favoritos_routes, url_prefix='/api')  # Para acceso a rutas de API Favoritos
    app.register_blueprint(admin_routes, url_prefix='/') # Para acceso a rutas del backend Modo admin
    
    # INICIALIZAR EL SERVICIO DE RECORDATORIOS CON LA APP
    reminder_service.init_app(app)
    
    # Crear tablas al iniciar la aplicación
    with app.app_context():
        User.create_table_if_not_exists()
        Sede.create_table_if_not_exists()
        Medicamentos.create_table_if_not_exists()
        Disponibilidad.create_table_if_not_exists()
        Favoritos.create_table_if_not_exists()
        Recoleccion.create_table_if_not_exists()
        print("Tablas verificadas/creadas exitosamente")
        
        # Iniciar el servicio de recordatorios
        try:
            reminder_service.start_daily_reminders()
            print("✅ Servicio de recordatorios iniciado correctamente")
        except Exception as e:
            print(f"❌ Error iniciando servicio de recordatorios: {str(e)}")
    
    return app

app = create_app()

# WebSocket events
@socketio.on('connect')
def handle_connect():
    print('Cliente conectado via WebSocket')
    socketio.emit('connection_response', {'data': 'Conectado al servidor'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Cliente desconectado')

if __name__ == '__main__':
    print("Iniciando servidor Backend de MediFast...")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)