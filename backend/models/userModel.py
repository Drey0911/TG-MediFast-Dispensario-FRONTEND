from config.connection import db
from sqlalchemy.exc import SQLAlchemyError
import bcrypt

class User(db.Model):
    __tablename__ = 'usuarios'
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    apellidos = db.Column(db.String(100), nullable=False)
    dni = db.Column(db.String(20), unique=True, nullable=False)
    telefono = db.Column(db.String(20), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(20), default='user')
    
    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'apellidos': self.apellidos,
            'dni': self.dni,
            'telefono': self.telefono,
            'rol': self.rol
        }
    
    def set_password(self, password):
        # Hash de la contraseña con bcrypt
        salt = bcrypt.gensalt()
        self.password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))
    
    @classmethod
    def create_table_if_not_exists(cls):
        try:
            # Verificar si la tabla ya existe
            inspector = db.inspect(db.engine)
            if not inspector.has_table(cls.__tablename__):
                cls.__table__.create(db.engine)
                print(f"Tabla {cls.__tablename__} creada exitosamente")
            else:
                print(f"Tabla {cls.__tablename__} ya existe")
        except SQLAlchemyError as e:
            print(f"Error al crear la tabla: {str(e)}")