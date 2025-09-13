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
from socketsExtends import socketio  
from routes.adminRoutes import admin_routes
import os

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
    app.register_blueprint(admin_routes, url_prefix='/') # Para acceso a rutas del backend Modo admin
    
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

# Crear tablas al iniciar la aplicación
with app.app_context():
    User.create_table_if_not_exists()
    Sede.create_table_if_not_exists()
    Medicamentos.create_table_if_not_exists()
    Disponibilidad.create_table_if_not_exists()
    Favoritos.create_table_if_not_exists()
    Recoleccion.create_table_if_not_exists()
    print("Tablas verificadas/creadas exitosamente")

if __name__ == '__main__':
    print("Iniciando servidor Flask con WebSockets...")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)