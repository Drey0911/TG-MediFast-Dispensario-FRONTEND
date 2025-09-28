import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image,
  Dimensions
} from 'react-native';
import { User } from '../../models/User';
import { UserPresenter } from '../../presenters/UserPresenter';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import io, { Socket } from 'socket.io-client';
import { getConfig } from '../../config/apiBase';
import ButtonModules from '../components/ButtonModules'; 
import LinearGradient from 'react-native-linear-gradient';
import Alert, { AlertType } from '../components/Alert'; 
import Loading from '../components/Loading';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

// Variable global para mantener la instancia del socket
let socket: Socket | null = null;

const initSocket = async (): Promise<Socket> => {
  if (socket) return socket;
  
  const token = await AuthPresenter.getToken();
  const API_BASE_URL = `${getConfig().API_BASE_URL}`;
  
  socket = io(API_BASE_URL, {
    auth: {
      token: token
    }
  });
  
  return socket;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para controlar la alerta
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('info');
  const [alertConfirmAction, setAlertConfirmAction] = useState<(() => void) | undefined>(undefined);

  const showAlert = (title: string, message: string, type: AlertType = 'info', onConfirm?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertConfirmAction(() => onConfirm);
    setAlertVisible(true);
  };

  const loadUserData = useCallback(async () => {
    try {
      const userData = await UserPresenter.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const setupWebSockets = useCallback(async (currentUser: User) => {
    try {
      const userSocket = await initSocket();
      const token = await AuthPresenter.getToken();
      
      if (token && currentUser) {
        // Unirse a la sala del usuario
        userSocket.emit('join_user_room', { user_id: currentUser.id, token });
        
        // Escuchar actualizaciones del usuario
        userSocket.on('usuario_actualizado', (updatedUser: User) => {
          if (updatedUser.id === currentUser.id) {
            setUser(updatedUser);
          }
        });
        
        userSocket.on('error', (error: any) => {
          console.log('Error de WebSocket:', error);
        });
      }
      
      return socket;
    } catch (error) {
      console.log('Error al configurar WebSockets:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      const userData = await loadUserData();
      
      if (userData) {
        // Configurar WebSockets después de cargar los datos del usuario
        await setupWebSockets(userData);
      }
    };

    initializeApp();

    // Cleanup al desmontar el componente
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [loadUserData, setupWebSockets]);

  const handleLogout = async () => {
    try {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      await AuthPresenter.logout();
      navigation.replace('Login');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleMedicamentosPress = () => {
    navigation.navigate('Medicamentos');
  };

  const handleRecoleccionesPress = () => {
    navigation.navigate('Recolecciones');
  };

  const handleFavoritosPress = () => {
    navigation.navigate('Favoritos');
  };

  const handleUserPress = () => {
    navigation.navigate('User');
  };

  const handleHistorialPress = () => {
  navigation.navigate('Historial');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Loading visible={true} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#42d68c', '#239c64ff']}
        style={styles.header}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
      >
        <Text style={styles.welcomeText}>
          Bienvenido, {user?.nombre || 'Usuario No encontrado'} {user?.apellidos || ''}
        </Text>
        <Text style={styles.dniText}>DNI: {user?.dni || 'Dni No Encontrado'}</Text>
      </LinearGradient>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.mainContent}>
          
          {/* Grid de 2 columnas y 3 filas */}
          <View style={styles.gridContainer}>
            {/* Fila 1 */}
            <View style={styles.row}>
              <ButtonModules
                iconName="calendar"
                colorIcon='#4eb32fff'
                title="Recolecciones"
                description="Reclama tu medicamento"
                colors={['#ffffffff', '#ecececff']}
                titleColor="#4eb32fff" 
                descriptionColor="#505050ff" 
                onPress={handleRecoleccionesPress}
              />
              
              <ButtonModules
                iconName="medkit"
                colorIcon='#2fb8d7ff'
                title="Medicamentos"
                description="Inventario de medicamentos"
                colors={['#ffffffff', '#ecececff']}
                titleColor="#2fb8d7ff" 
                descriptionColor="#505050ff"
                onPress={handleMedicamentosPress}
              />
            </View>
            
            {/* Fila 2 */}
            <View style={styles.row}>
              <ButtonModules
                iconName="heart"
                colorIcon='#b02121ff'
                title="Favoritos"
                description="Recibe alertas de disponibilidad"
                colors={['#ffffffff', '#ecececff']}
                titleColor="#b02121ff" 
                descriptionColor="#505050ff"
                onPress={handleFavoritosPress}
              />
              
              <ButtonModules
                iconName="user"
                colorIcon='#851072ff'
                title="Mi Perfil"
                description="Tu informacion personal"
                colors={['#ffffffff', '#ecececff']}
                titleColor="#851072ff" 
                descriptionColor="#505050ff"
                onPress={handleUserPress}
              />
            </View>
            
            {/* Fila 3 */}
            <View style={styles.row}>
              <ButtonModules
                iconName="history"
                colorIcon='#e1c735ff'
                title="Historial"
                description="Tus recoleccciones pasadas"
                colors={['#ffffffff', '#ecececff']}
                titleColor="#e1c735ff" 
                descriptionColor="#505050ff"
                onPress={handleHistorialPress}
              />
              
              <ButtonModules
                iconName="sign-out"
                colorIcon='white'
                title="Cerrar Sesión"
                description="Salir de tu cuenta"            
                titleColor="white" 
                descriptionColor="#d3d3d3ff"
                onPress={handleLogout}
              />
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Footer con logo mejorado */}
      <View style={styles.footer}>
        <Image 
          source={require('../../img/logo-green.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Componente Alert */}
      <Alert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        confirmText="Aceptar"
        cancelText="Cancelar"
        onConfirm={alertConfirmAction}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

// Estilos actualizados
const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  dniText: {
    fontSize: 16,
    color: 'white',
    opacity: 1,
  },
  mainContent: {
    padding: 15,
    alignItems: 'center',
    paddingBottom: 10, 
  },
  titleGradient: {
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
    width: width - 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  gridContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10, 
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  footer: {
    paddingHorizontal: 10,
    paddingVertical: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: 'rgba(66, 214, 140, 0.1)',
  },
  logo: {
    width: 200,
    height: 50,
    marginBottom: 45,
  },
});

export default HomeScreen;