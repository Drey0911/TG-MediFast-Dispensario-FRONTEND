import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Text, 
  TextInput, 
  TouchableOpacity,
  ActivityIndicator 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import BrandHeader from '../components/BrandHeader';
import Alert, { AlertType } from '../components/Alert'; 
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type PasswordRecoveryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PasswordRecovery'>;

const PasswordRecoveryScreen: React.FC = () => {
  const navigation = useNavigation<PasswordRecoveryScreenNavigationProp>();
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('+57');
  const [loading, setLoading] = useState(false);
  
  // Estados para controlar la alerta
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('info');
  const [alertConfirmAction, setAlertConfirmAction] = useState<(() => void) | undefined>(undefined);

  // Función para manejar el cambio de teléfono
  const handleTelefonoChange = (text: string) => {
    // Siempre mantener +57 al inicio
    if (text.length < 3) {
      setTelefono('+57');
    } else if (!text.startsWith('+57')) {
      setTelefono('+57' + text.replace('+57', ''));
    } else {
      // Limitar a +57 + 10 dígitos
      if (text.length <= 13) {
        setTelefono(text);
      }
    }
  };

  const showAlert = (title: string, message: string, type: AlertType = 'info', onConfirm?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertConfirmAction(() => onConfirm);
    setAlertVisible(true);
  };

  const handlePasswordRecovery = async () => {
    if (!dni || !telefono) {
      showAlert('Campos obligatorios', 'Por favor completa todos los campos', 'error');
      return;
    }

    // Validación básica de DNI (números)
    if (!/^\d+$/.test(dni)) {
      showAlert('DNI inválido', 'El DNI debe contener solo números', 'error');
      return;
    }

    // Validación básica de teléfono - debe tener exactamente +57 + 10 dígitos
    if (!/^\+57\d{10}$/.test(telefono)) {
      showAlert('Teléfono inválido', 'El teléfono debe tener 10 dígitos después de +57', 'error');
      return;
    }

    setLoading(true);
    try {
      await AuthPresenter.recoverPassword(dni, telefono);
      showAlert(
        '¡Éxito!', 
        'Se ha enviado un mensaje a tu número de WhatsApp con la nueva contraseña de recuperación. Por favor cámbiala lo más pronto posible por tu seguridad.', 
        'success', 
        () => {
          navigation.goBack();
        }
      );
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
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
            
            <View style={styles.formContainer}>
              <View style={styles.formCard}>
                <Text style={styles.title}>Recuperar Contraseña</Text>
                <Text style={styles.subtitle}>
                  Ingresa tu DNI y número de teléfono para recibir una nueva contraseña por WhatsApp
                </Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>DNI</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ingresa tu DNI"
                    placeholderTextColor="#999"
                    value={dni}
                    onChangeText={setDni}
                    keyboardType="numeric"
                    maxLength={20}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Teléfono</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+57 seguido de tu número"
                    placeholderTextColor="#999"
                    value={telefono}
                    onChangeText={handleTelefonoChange}
                    keyboardType="phone-pad"
                    maxLength={13}
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handlePasswordRecovery}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Recuperar Contraseña</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleGoBack}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backButtonText}>Volver al Login</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    marginBottom: 2,
    marginTop: 70,
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
  formContainer: {
    flex: 2,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2a9960',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2a9960',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  button: {
    backgroundColor: '#2a9960',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#2a9960',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#2a9960',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default PasswordRecoveryScreen;