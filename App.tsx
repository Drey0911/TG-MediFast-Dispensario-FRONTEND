import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './views/screens/LoginScreen';
import RegisterScreen from './views/screens/RegisterScreen';
import HomeScreen from './views/screens/HomeScreen';
import MedicamentosScreen from './views/screens/MedicamentosScreen';
import Splash from './views/components/Splash';
import { AuthPresenter } from './presenters/AuthPresenter';
import io, { Socket } from 'socket.io-client';
import { getConfig } from './config/apiBase';
import DetailScreen from './views/screens/DetailScreen';
import PackageScreen from './views/screens/PackageScreen';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Medicamentos: undefined;
  Detail: { medicamentoId: number };
  Package: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Variable global para la instancia del socket
let socket: Socket | null = null;

const initSocket = async (): Promise<Socket | null> => {
  try {
    if (socket) return socket;
    
    const token = await AuthPresenter.getToken();
    if (!token) {
      console.log('No hay token disponible para conectar WebSocket');
      return null;
    }
    
    const API_BASE_URL = `${getConfig().API_BASE_URL}`;
    
    socket = io(API_BASE_URL, {
      auth: {
        token: token
      }
    });
    
    socket.on('connect', () => {
      console.log('Conectado al servidor WebSocket');
    });
    
    socket.on('disconnect', () => {
      console.log('Desconectado del servidor WebSocket');
    });
    
    socket.on('error', (error) => {
      console.log('Error de WebSocket:', error);
    });
    
    return socket;
  } catch (error) {
    console.log('Error al inicializar WebSocket:', error);
    return null;
  }
};

const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('WebSocket desconectado');
  }
};

const App: React.FC = () => {
  const [nextScreen, setNextScreen] = useState<'Login' | 'Home'>('Login');

  useEffect(() => {
    checkAuthStatus();
    
    // Cleanup al desmontar el componente
    return () => {
      disconnectSocket();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AuthPresenter.getToken();
      
      if (token) {
        const user = await AuthPresenter.getCurrentUser();
        if (user) {
          setNextScreen('Home');
          await initSocket();
        } else {
          await AuthPresenter.logout();
          setNextScreen('Login');
        }
      } else {
        setNextScreen('Login');
      }
    } catch (error) {
      console.log('Error verificando autenticación:', error);
      setNextScreen('Login');
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="Splash">
          {(props) => <Splash {...props} nextScreen={nextScreen} />}
        </Stack.Screen>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Medicamentos" component={MedicamentosScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
        <Stack.Screen name="Package" component={PackageScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;