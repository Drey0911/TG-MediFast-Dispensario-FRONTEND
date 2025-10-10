import React from 'react';
import { View, StyleSheet, Image, Text, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomInput from './CustomInput';
import CustomButton from './CustomButton';

interface LoginFormProps {
  dni: string;
  password: string;
  loading: boolean;
  onDniChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  onLogin: () => void;
  onNavigateToRegister: () => void;
  onNavigateToPasswordRecovery: () => void; 
}

const LoginForm: React.FC<LoginFormProps> = ({
  dni,
  password,
  loading,
  onDniChange,
  onPasswordChange,
  onLogin,
  onNavigateToRegister,
  onNavigateToPasswordRecovery, 
}) => {
  return (
    <LinearGradient
      colors={['#239c64ff', '#2eb374', '#42d68c']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
    >
      <View style={styles.formContainer}>
        <Image
          source={require('../../img/person.png')}
          style={styles.illustration}
          resizeMode="contain"
        />
        
        {/* Separación */}
        <View style={styles.inputsContainer}>
          <CustomInput
            label="DNI"
            value={dni}
            onChangeText={onDniChange}
            placeholder="Ingrese su DNI..."
            keyboardType="numeric"
            autoCapitalize="none"
          />
          
          <CustomInput
            label="Contraseña"
            value={password}
            onChangeText={onPasswordChange}
            placeholder="Ingrese su contraseña..."
            secureTextEntry
            showTogglePassword 
          />

          {/* Botón de olvidé mi contraseña */}
          <View style={styles.forgotPasswordContainer}>
            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={onNavigateToPasswordRecovery}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.buttonsContainer}>
          <CustomButton
            title={loading ? "Cargando..." : "Iniciar Sesión"}
            onPress={onLogin}
            loading={loading}
            variant="primary"
          />
          
          {/* Contenedor para el texto y botón de registro */}
          <LinearGradient
            colors={['#2eb374', '#38cc80', '#42d68c']}
            style={styles.registerSection}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.registerTitle}>Forma parte de nosotros, registrate</Text>
            
            <LinearGradient
              colors={['#2fbb77ff', '#38cc80', '#40d489']}
              style={styles.registerButtonContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <CustomButton
                title="Crear cuenta"
                onPress={onNavigateToRegister}
                variant="secondary"
                disabled={loading}
              />
            </LinearGradient>
          </LinearGradient>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 45,
    borderTopRightRadius: 45,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    minHeight: '65%',
  },
  illustration: {
    width: '100%',
    height: 270,
    marginBottom: 8,
  },
  inputsContainer: {
    marginBottom: -10,
  },
  buttonsContainer: {
    marginTop: 5,
    marginBottom: 5
  },
  registerSection: {
    marginTop: 10,
    alignItems: 'center',
    borderRadius: 25,
    padding: 30,
    marginHorizontal: -10, 
    height: 150,
    marginBottom: 5,
  },
  registerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  registerSubtitle: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  registerButtonContainer: {
    borderRadius: 12,
    padding: 2,
    width: '100%',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  forgotPasswordButton: {
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  forgotPasswordText: {
    color: '#2a9960',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default LoginForm;