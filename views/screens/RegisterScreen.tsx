import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import BrandHeader from '../components/BrandHeader';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import Alert, { AlertType } from '../components/Alert';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type RegisterScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Register'
>;

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('+57');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para controlar la alerta
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('info');
  const [alertConfirmAction, setAlertConfirmAction] = useState<
    (() => void) | undefined
  >(undefined);

  useEffect(() => {
    setTelefono('+57');
  }, []);

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = 'info',
    onConfirm?: () => void,
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertConfirmAction(() => onConfirm);
    setAlertVisible(true);
  };

  const handleRegister = async () => {
    if (!nombre || !apellidos || !dni || !telefono || !password) {
      showAlert(
        'Campos obligatorios',
        'Por favor completa todos los campos',
        'error',
      );
      return;
    }

    // Validar que el teléfono tenga más que solo +57
    if (telefono.length <= 3) {
      showAlert(
        'Teléfono inválido',
        'Por favor ingrese un número de teléfono válido',
        'error',
      );
      return;
    }

    setLoading(true);
    try {
      await AuthPresenter.register(nombre, apellidos, dni, telefono, password);
      showAlert(
        '¡Registro exitoso!',
        'Tu cuenta ha sido creada correctamente',
        'success',
        () => {
          navigation.replace('Home');
        },
      );
    } catch (error: any) {
      showAlert('Error en registro', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToLogin = () => {
    navigation.replace('Login');
  };

  const handleTelefonoChange = (text: string) => {
    if (!text || text.length < 3) {
      setTelefono('+57');
      return;
    }

    if (!text.startsWith('+57')) {
      const numeros = text.replace(/\D/g, '');
      setTelefono('+57' + numeros);
      return;
    }

    const parteNumerica = text.substring(3);
    const soloNumeros = parteNumerica.replace(/\D/g, '');
    setTelefono('+57' + soloNumeros);
  };

  return (
    <LinearGradient
      colors={['#239c64ff', '#2eb374', '#42d68c']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}>
      <SafeAreaView style={styles.safeAreaView}>
        <StatusBar barStyle="light-content" backgroundColor="#2a9960" />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.topSection}>
              <BrandHeader />
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputsContainer}>
                <CustomInput
                  label="Nombre"
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Ingrese su nombre..."
                  autoCapitalize="words"
                />

                <CustomInput
                  label="Apellidos"
                  value={apellidos}
                  onChangeText={setApellidos}
                  placeholder="Ingrese sus apellidos..."
                  autoCapitalize="words"
                />

                <CustomInput
                  label="DNI"
                  value={dni}
                  onChangeText={setDni}
                  placeholder="Ingrese su DNI..."
                  keyboardType="numeric"
                  autoCapitalize="none"
                />

                <CustomInput
                  label="Teléfono"
                  value={telefono}
                  onChangeText={handleTelefonoChange}
                  placeholder="+57 Ingrese su teléfono..."
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />

                <CustomInput
                  label="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Ingrese su contraseña..."
                  secureTextEntry
                  showTogglePassword 
                />
              </View>

              <View style={styles.buttonsContainer}>
                <CustomButton
                  title={loading ? 'Cargando...' : 'Registrarse'}
                  onPress={handleRegister}
                  loading={loading}
                  variant="primary"
                />

                <LinearGradient
                  colors={['#2eb374', '#38cc80', '#42d68c']}
                  style={styles.loginSection}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <Text style={styles.loginTitle}>
                    ¿Ya tienes una cuenta?
                  </Text>

                  <View style={styles.loginButtonContainer}>
                    <CustomButton
                      title="Iniciar Sesión"
                      onPress={handleNavigateToLogin}
                      variant="secondary"
                      disabled={loading}
                    />
                  </View>
                </LinearGradient>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

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
  container: { flex: 1 },
  safeAreaView: { flex: 1 },
  keyboardAvoidingView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, minHeight: '100%' },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 150,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 45,
    borderTopRightRadius: 45,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    minHeight: '65%',
  },
  inputsContainer: { marginBottom: -10 },
  buttonsContainer: { marginTop: 20, marginBottom: 5 },
  loginSection: {
    marginTop: 10,
    alignItems: 'center',
    borderRadius: 25,
    padding: 30,
    marginHorizontal: -10,
    height: 150,
    marginBottom: 25,
  },
  loginTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  loginButtonContainer: { borderRadius: 12, padding: 2, width: '100%' },
});

export default RegisterScreen;
