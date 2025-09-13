import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import BrandHeader from '../components/BrandHeader';
import LoginForm from '../components/LoginForm';
import Alert, { AlertType } from '../components/Alert'; 
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
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

  const handleLogin = async () => {
    if (!dni || !password) {
      showAlert('Campos obligatorios', 'Por favor completa todos los campos', 'error');
      return;
    }

    setLoading(true);
    try {
      await AuthPresenter.login(dni, password);
      showAlert('¡Éxito!', 'Inicio de sesión exitoso', 'success', () => {
        navigation.replace('Home');
      });
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <LinearGradient
      colors={['#239c64ff', '#2eb374', '#42d68c']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <SafeAreaView style={styles.safeAreaView}>
        <StatusBar barStyle="light-content" backgroundColor="#2a9960" />
        
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.topSection}>
              <BrandHeader />
            </View>
            
            <LoginForm
              dni={dni}
              password={password}
              loading={loading}
              onDniChange={setDni}
              onPasswordChange={setPassword}
              onLogin={handleLogin}
              onNavigateToRegister={handleNavigateToRegister}
            />
          </ScrollView>
        </KeyboardAvoidingView>
        
        <View style={styles.bottomBackground} />
        
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
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeAreaView: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: '100%',
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 120, 
  },
  bottomBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100, 
    backgroundColor: '#FAFAFA',
    zIndex: -1,
  },
});

export default LoginScreen;