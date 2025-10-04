import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecoleccionCarrito } from '../../models/Recoleccion';
import { RecoleccionPresenter } from '../../presenters/RecoleccionPresenter';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import DateTimePicker from '@react-native-community/datetimepicker';
import AlertComponent, { AlertType } from '../components/Alert';
import Loading from '../components/Loading';

type PackageScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Package'>;

const PackageScreen: React.FC = () => {
  const navigation = useNavigation<PackageScreenNavigationProp>();
  const [carrito, setCarrito] = useState<RecoleccionCarrito[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadCarrito();
  }, []);


  // Limpiado por si el carrito presenta alguna corrupcion por las entradas del async storage
  const loadCarrito = async () => {
    try {
      const carritoStr = await AsyncStorage.getItem('carrito');
      if (carritoStr) {
        const carritoData = JSON.parse(carritoStr);
        setCarrito(carritoData);
      }
    } catch (error) {
      console.log('Limpieza del asyncStorage');
      await AsyncStorage.removeItem('carrito');
      setCarrito([]);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Loading visible={true} />
      </View>
    );
  }

  const updateCantidad = async (index: number, newCantidad: string) => {
    const cantidadNum = parseInt(newCantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      showAlert('Error', 'La cantidad debe ser un número válido mayor a 0', 'error');
      return;
    }

    if (cantidadNum > carrito[index].maxCantidad) {
      showAlert('Error', `No puedes solicitar más de ${carrito[index].maxCantidad} unidades`, 'error');
      return;
    }

    const newCarrito = [...carrito];
    newCarrito[index].cantidad = cantidadNum;
    setCarrito(newCarrito);
    await AsyncStorage.setItem('carrito', JSON.stringify(newCarrito));
  };

  const removeFromCarrito = async (index: number) => {
    try {
      const newCarrito = [...carrito];
      newCarrito.splice(index, 1);
      setCarrito(newCarrito);
      await AsyncStorage.setItem('carrito', JSON.stringify(newCarrito));
      showAlert('Éxito', 'Medicamento eliminado del paquete', 'success');
    } catch (error) {
      showAlert('Error', 'No se pudo eliminar el medicamento', 'error');
    }
  };

  const clearCarrito = async () => {
    try {
      setCarrito([]);
      await AsyncStorage.removeItem('carrito');
      showAlert('Éxito', 'Paquete vaciado', 'success');
    } catch (error) {
      showAlert('Error', 'No se pudo vaciar el paquete', 'error');
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      
      const updatedCarrito = carrito.map(item => ({
        ...item,
        fechaRecoleccion: date.toISOString().split('T')[0]
      }));
      setCarrito(updatedCarrito);
      AsyncStorage.setItem('carrito', JSON.stringify(updatedCarrito));
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      setSelectedTime(time);
      
      const timeString = time.toTimeString().split(' ')[0];
      const updatedCarrito = carrito.map(item => ({
        ...item,
        horaRecoleccion: timeString
      }));
      setCarrito(updatedCarrito);
      AsyncStorage.setItem('carrito', JSON.stringify(updatedCarrito));
    }
  };

const scheduleRecoleccion = async () => {
  if (carrito.length === 0) {
    showAlert('Error', 'El paquete está vacío', 'error');
    return;
  }

  // Verificar que todas las recolecciones tengan fecha y hora
  const incomplete = carrito.some(item => !item.fechaRecoleccion || !item.horaRecoleccion);
  if (incomplete) {
    showAlert('Error', 'Todos los medicamentos deben tener fecha y hora de recolección', 'error');
    return;
  }

  try {
    setLoading(true);
    const user = await AuthPresenter.getCurrentUser();
    if (!user) {
      showAlert('Error', 'Usuario no autenticado', 'error');
      return;
    }

    // Preparar datos para el batch
    const recoleccionesData = carrito.map(item => ({
      id_medicamento: item.medicamentoId,
      id_usuario: user.id,
      fechaRecoleccion: item.fechaRecoleccion,
      horaRecoleccion: item.horaRecoleccion,
      cantidad: item.cantidad,
      id_sede: item.sedeId 
    }));

    // Crear recolecciones en batch
    await RecoleccionPresenter.createRecoleccionBatch(recoleccionesData);

    // Limpiar carrito
    await clearCarrito();
    
    // Mostrar mensaje de éxito y navegar a Home
    showAlert('Éxito', '¡Listo! Su recolección ya se agendó', 'success');
    
  } catch (error: any) {
    showAlert('Error', error.message, 'error');
  } finally {
    setLoading(false);
  }
};

  const handleAlertConfirm = () => {
    setAlertVisible(false);
    if (alertType === 'success' && alertTitle === 'Éxito' && alertMessage === '¡Listo! Su recolección ya se agendó') {
      // Navegar a Home luego de agregarse exitosamente a la base de datos
      navigation.navigate('Home');
    }
  };

  const renderCarritoItem = ({ item, index }: { item: RecoleccionCarrito; index: number }) => (
    <View style={styles.carritoItem}>
      <View style={styles.carritoItemInfo}>
        <Text style={styles.medicamentoName}>{item.medicamentoNombre}</Text>
        <Text style={styles.sedeName}>{item.sedeNombre}</Text>
        
        <View style={styles.cantidadContainer}>
          <Text style={styles.cantidadLabel}>Cantidad:</Text>
          <TextInput
            style={styles.cantidadInput}
            value={item.cantidad.toString()}
            onChangeText={(text) => updateCantidad(index, text)}
            keyboardType="numeric"
            maxLength={5}
          />
          <Text style={styles.stockMaxText}>Máx: {item.maxCantidad}</Text>
        </View>

        <Text style={styles.stockText}>Stock disponible: {item.stock}</Text>
        <Text style={[
          styles.statusBadge,
          item.estado === 'disponible' && styles.statusAvailable,
          item.estado === 'poco_stock' && styles.statusLow,
          item.estado === 'agotado' && styles.statusZero
        ]}>
          {item.estado === 'disponible' ? 'Disponible' : 
           item.estado === 'poco_stock' ? 'Poco Stock' : 'Agotado'}
        </Text>
        
        <View style={styles.datetimeContainer}>
          <TouchableOpacity 
            style={styles.datetimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={16} color="#42d68c" />
            <Text style={styles.datetimeText}>
              {item.fechaRecoleccion || 'Seleccionar fecha'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.datetimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Icon name="clock-o" size={16} color="#42d68c" />
            <Text style={styles.datetimeText}>
              {item.horaRecoleccion || 'Seleccionar hora'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => removeFromCarrito(index)}
      >
        <Icon name="trash" size={20} color="#ff6b6b" />
      </TouchableOpacity>
    </View>
  );

  const totalCantidad = carrito.reduce((total, item) => total + item.cantidad, 0);

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
          <Icon name="archive" size={24} color="white" style={styles.titleIcon} />
          <Text style={styles.titleText}>Paquete para Recoleccion</Text>
        </View>
        
        {carrito.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearCarrito}
          >
            <Icon name="trash" size={20} color="white" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      {carrito.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="archive" size={50} color="#ddd" />
          <Text style={styles.emptyText}>Tu paquete está vacío</Text>
          <Text style={styles.emptySubtext}>
            Agrega medicamentos desde la pantalla de detalles
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={carrito}
            renderItem={renderCarritoItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.listContainer}
          />
          
            <View style={styles.footer}>
            <View style={styles.summaryContainer}>
              <Text style={styles.totalText}>
              {carrito.length} medicamento{carrito.length !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.totalCantidadText}>
              {totalCantidad} unidad{totalCantidad !== 1 ? 'es' : ''} total
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('Medicamentos')}
              disabled={loading}
            >
              <Icon name="plus" size={20} color="white" />
              <Text style={styles.addButtonText}>Agregar otro medicamento</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.scheduleButton}
              onPress={scheduleRecoleccion}
              disabled={loading}
            >
              <Icon name="calendar-check-o" size={20} color="white" />
              <Text style={styles.scheduleButtonText}>Agendar Recolección</Text>
            </TouchableOpacity>
            </View>
        </>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
      
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* Alert Component */}
      <AlertComponent
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        confirmText="Aceptar"
        onConfirm={handleAlertConfirm}
        onClose={handleAlertConfirm}
      />
    </View>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#3e9c6dff',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.030
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  container: { 
    flex: 1,
    backgroundColor: '#f5f5f5' 
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
    padding: 5 
  },
  titleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1 
  },
  titleIcon: { 
    marginRight: 10 
  },
  titleText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: 'white' 
  },
  clearButton: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 15,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
  },
  carritoItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  carritoItemInfo: {
    flex: 1,
  },
  medicamentoName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sedeName: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  cantidadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  cantidadLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  cantidadInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 5,
    width: 60,
    textAlign: 'center',
    marginRight: 10,
  },
  stockMaxText: {
    fontSize: 12,
    color: '#999',
  },
  stockText: {
    fontSize: 14,
    color: '#42d68c',
  },
  datetimeContainer: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  datetimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
  },
  datetimeText: {
    marginLeft: 5,
    color: '#666',
  },
  removeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalCantidadText: {
    fontSize: 16,
    color: '#42d68c',
    fontWeight: 'bold',
  },
  scheduleButton: {
    flexDirection: 'row',
    backgroundColor: '#42d68c',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.075
  },
  scheduleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  statusAvailable: {
    backgroundColor: '#42d68c',
  },
  statusLow: {
    backgroundColor: '#f6c23e',
  },
  statusZero: {
    backgroundColor: '#ff6b6b',
  },
});

export default PackageScreen;