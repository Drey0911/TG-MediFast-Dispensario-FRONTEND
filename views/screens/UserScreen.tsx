import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { UserPresenter } from '../../presenters/UserPresenter';
import AlertComponent, { AlertType } from '../components/Alert';
import Loading from '../components/Loading';
import CustomInput from '../components/CustomInput';
import { User } from '../../models/User';

type UserScreenNavigationProp = StackNavigationProp<RootStackParamList, 'User'>;

const UserScreen: React.FC = () => {
  const navigation = useNavigation<UserScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    dni: '',
    telefono: '',
    password: '',
    confirmPassword: '',
  });

  // Estados para alerta
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('info');

  const showAlert = (title: string, message: string, type: AlertType = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

 // Cargar datos del usuario con useCallback
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await UserPresenter.getCurrentUser();
      setUser(userData);
      setFormData({
        nombre: userData.nombre,
        apellidos: userData.apellidos,
        dni: userData.dni,
        telefono: userData.telefono,
        password: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      showAlert('Error', 'No se pudieron cargar los datos del usuario', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]); 

  // Manejar cambios en los inputs
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validar formulario
  const validateForm = (): boolean => {
    if (!formData.nombre.trim()) {
      showAlert('Error', 'El nombre es requerido', 'error');
      return false;
    }

    if (!formData.apellidos.trim()) {
      showAlert('Error', 'Los apellidos son requeridos', 'error');
      return false;
    }

    if (!formData.dni.trim()) {
      showAlert('Error', 'El DNI es requerido', 'error');
      return false;
    }

    if (!formData.telefono.trim()) {
      showAlert('Error', 'El teléfono es requerido', 'error');
      return false;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      showAlert('Error', 'Las contraseñas no coinciden', 'error');
      return false;
    }

    return true;
  };

const handleSave = async () => {
  if (!validateForm() || !user) return;

  try {
    setLoading(true); // Activar loading
    setSaving(true);

    // Preparar datos para enviar (solo enviar password si se modificó)
    const updateData: any = {
      nombre: formData.nombre.trim(),
      apellidos: formData.apellidos.trim(),
      dni: formData.dni.trim(),
      telefono: formData.telefono.trim(),
    };

    if (formData.password) {
      updateData.password = formData.password;
    }

    // Actualizar usuario
    const updatedUser = await UserPresenter.updateUser(user.id, updateData);
    
    // Actualizar datos locales
    setUser(updatedUser);
    setFormData(prev => ({
      ...prev,
      password: '',
      confirmPassword: '',
    }));

    showAlert('Éxito', 'Perfil actualizado correctamente', 'success');
    
  } catch (error: any) {
    // Manejar errores específicos del backend
    const errorMessage = error.message.includes('DNI ya está en uso') ? 
      'El DNI ya está en uso por otro usuario' :
      error.message.includes('telefono ya está en uso') ?
      'El teléfono ya está en uso por otro usuario' :
      error.message.includes('Contraseña inválida') ?
      'La contraseña no cumple con los requisitos de seguridad' :
      'Error al actualizar el perfil';

    showAlert('Error', errorMessage, 'error');
  } finally {
    setLoading(false); // Desactivar loading
    setSaving(false);
  }
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
      {/* Header */}
      <LinearGradient
        colors={['#42d68c', '#239c64ff']}
        style={styles.header}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Icon name="user" size={24} color="white" style={styles.titleIcon} />
          <Text style={styles.titleText}>Mi Perfil</Text>
        </View>
    
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Información del usuario */}
        <View style={styles.userInfoCard}>
          <View style={styles.avatarContainer}>
            <Icon name="user-circle" size={80} color="#42d68c" />
            <Text style={styles.userRole}>{user?.rol || 'Usuario'}</Text>
          </View>

          <Text style={styles.userName}>
            {user?.nombre} {user?.apellidos}
          </Text>
          <Text style={styles.userDni}>DNI: {user?.dni}</Text>
        </View>

        {/* Formulario de edición */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          
          <CustomInput
            label="Nombre"
            value={formData.nombre}
            onChangeText={(text) => handleInputChange('nombre', text)}
            placeholder="Ingresa tu nombre"
          />

          <CustomInput
            label="Apellidos"
            value={formData.apellidos}
            onChangeText={(text) => handleInputChange('apellidos', text)}
            placeholder="Ingresa tus apellidos"
          />

          <CustomInput
            label="DNI"
            value={formData.dni}
            onChangeText={(text) => handleInputChange('dni', text)}
            placeholder="Ingresa tu DNI"
            keyboardType="numeric"
          />

          <CustomInput
            label="Teléfono"
            value={formData.telefono}
            onChangeText={(text) => handleInputChange('telefono', text)}
            placeholder="Ingresa tu teléfono"
            keyboardType="phone-pad"
          />

          <Text style={styles.sectionTitle}>Cambiar Contraseña</Text>
          <Text style={styles.passwordHint}>
            Deja estos campos vacíos si no deseas cambiar la contraseña
          </Text>

          <CustomInput
            label="Nueva Contraseña"
            value={formData.password}
            onChangeText={(text) => handleInputChange('password', text)}
            placeholder="Ingresa nueva contraseña"
            secureTextEntry={true}
            showTogglePassword={true}
          />

          <CustomInput
            label="Confirmar Contraseña"
            value={formData.confirmPassword}
            onChangeText={(text) => handleInputChange('confirmPassword', text)}
            placeholder="Confirma la nueva contraseña"
            secureTextEntry={true}
            showTogglePassword={true}
          />

          {/* Requisitos de contraseña */}
          {formData.password && (
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>La contraseña debe contener:</Text>
              <Text style={[styles.requirement, formData.password.length >= 8 && styles.requirementMet]}>
                • Mínimo 8 caracteres
              </Text>
              <Text style={[styles.requirement, /[A-Z]/.test(formData.password) && styles.requirementMet]}>
                • Al menos una mayúscula
              </Text>
              <Text style={[styles.requirement, /[0-9]/.test(formData.password) && styles.requirementMet]}>
                • Al menos un número
              </Text>
              <Text style={[styles.requirement, /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) && styles.requirementMet]}>
                • Al menos un símbolo
              </Text>
            </View>
          )}

          {/* Botones */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loading visible={true} />
              ) : (
                <>
                  <Icon name="save" size={16} color="white" style={styles.buttonIcon} />
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Alert Component */}
      <AlertComponent
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        confirmText="Aceptar"
        onConfirm={() => setAlertVisible(false)}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleIcon: {
    marginRight: 10,
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutButton: {
    padding: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  userInfoCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  userRole: {
    marginTop: 5,
    fontSize: 12,
    color: '#42d68c',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  userDni: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: height * 0.04,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  passwordHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  passwordRequirements: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  requirement: {
    fontSize: 11,
    color: '#666',
    marginLeft: 5,
  },
  requirementMet: {
    color: '#42d68c',
    fontWeight: 'bold',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#6c757d',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#42d68c',
    marginLeft: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#a0d6b4',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  buttonIcon: {
    marginRight: 5,
  },
});

export default UserScreen;