import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { Medicamento } from '../../models/Medicamento';
import { Disponibilidad } from '../../models/Medicamento';
import { MedicamentoPresenter } from '../../presenters/MedicamentoPresenter';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecoleccionCarrito } from '../../models/Recoleccion';
import Loading from '../components/Loading';
import AlertComponent, { AlertType } from '../components/Alert';

type DetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Detail'>;
type DetailScreenRouteProp = RouteProp<RootStackParamList, 'Detail'>;

const DetailScreen: React.FC = () => {
  const navigation = useNavigation<DetailScreenNavigationProp>();
  const route = useRoute<DetailScreenRouteProp>();
  const { medicamentoId } = route.params;

  const [medicamento, setMedicamento] = useState<Medicamento | null>(null);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSede, setSelectedSede] = useState<any>(null);
  const [cantidad, setCantidad] = useState<string>('1');

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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await AuthPresenter.getCurrentUser();
      
      const medData = await MedicamentoPresenter.getMedicamentoById(medicamentoId);
      setMedicamento(medData);
      
      const dispData = await MedicamentoPresenter.getDisponibilidadByMedicamento(medicamentoId);
      setDisponibilidades(dispData);
      
      if (dispData.length > 0) {
        setSelectedSede(dispData[0].sede);
      }
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [medicamentoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Loading visible={true} />
      </View>
    );
  }

  const handleAddToPackage = async () => {
    if (!selectedSede || !medicamento) {
      showAlert('Error', 'Debe seleccionar una sede', 'error');
      return;
    }

    const cantidadNum = parseInt(cantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      showAlert('Error', 'La cantidad debe ser un número válido mayor a 0', 'error');
      return;
    }

    try {
      let carrito: RecoleccionCarrito[] = [];
      
      try {
        const carritoStr = await AsyncStorage.getItem('carrito');
        if (carritoStr) {
          carrito = JSON.parse(carritoStr);
        }
      } catch (error) {
        console.log('⚠️ Carrito corrupto, limpiando...');
        await AsyncStorage.removeItem('carrito');
        carrito = [];
      }
      
      // Verificar si ya hay medicamentos de otra sede en el carrito
      if (carrito.length > 0) {
        const primeraSedeId = carrito[0].sedeId;
        if (primeraSedeId !== selectedSede.id) {
          showAlert(
            'Advertencia', 
            'No puedes agregar medicamentos de diferentes sedes en la misma recolección. ¿Deseas vaciar el carrito y agregar este medicamento?',
            'warning'
          );
          return;
        }
      }

      const disponibilidadSeleccionada = disponibilidades.find(d => d.id_sede === selectedSede.id);
      if (!disponibilidadSeleccionada) {
        showAlert('Error', 'No se encontró la disponibilidad seleccionada', 'error');
        return;
      }

      // Verificar stock disponible
      if (cantidadNum > disponibilidadSeleccionada.stock) {
        showAlert('Error', `Stock insuficiente. Máximo disponible: ${disponibilidadSeleccionada.stock}`, 'error');
        return;
      }

      // Verificar si el medicamento ya está en el carrito
      const existingIndex = carrito.findIndex(
        item => item.medicamentoId === medicamento.id && item.sedeId === selectedSede.id
      );

      if (existingIndex !== -1) {
        // Actualizar cantidad si ya existe
        const nuevaCantidad = carrito[existingIndex].cantidad + cantidadNum;
        if (nuevaCantidad > disponibilidadSeleccionada.stock) {
          showAlert('Error', `No puedes agregar más. Máximo disponible: ${disponibilidadSeleccionada.stock}`, 'error');
          return;
        }
        carrito[existingIndex].cantidad = nuevaCantidad;
      } else {
        // Agregar nuevo item al carrito
        carrito.push({
          medicamentoId: medicamento.id,
          medicamentoNombre: medicamento.nombreMedicamento,
          sedeId: selectedSede.id,
          sedeNombre: selectedSede.nombreSede,
          stock: disponibilidadSeleccionada.stock,
          estado: disponibilidadSeleccionada.estado,
          fechaRecoleccion: '',
          horaRecoleccion: '',
          cantidad: cantidadNum,
          maxCantidad: disponibilidadSeleccionada.stock
        });
      }

      // Guardar
      try {
        await AsyncStorage.setItem('carrito', JSON.stringify(carrito));
        showAlert('Éxito', 'Medicamento agregado al paquete', 'success');
        // Navegar a PackageScreen después de mostrar la alerta
        setTimeout(() => {
          navigation.navigate('Package');
        }, 1500);
      } catch (saveError) {
        console.error('Error al guardar carrito:', saveError);
        showAlert('Error', 'No se pudo guardar en el paquete', 'error');
      }
      
    } catch (error: any) {
      console.error('Error inesperado en handleAddToPackage:', error);
      showAlert('Error', 'Ocurrió un error inesperado', 'error');
    }
  };

  const handleCantidadChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setCantidad(numericValue);
  };

  const disponibilidadSeleccionada = disponibilidades.find(d => 
    selectedSede && d.id_sede === selectedSede.id
  );

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
          <Icon name="info" size={30} color="white" style={styles.titleIcon} />
          <Text style={styles.titleText}>Detalles del Medicamento</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {/* Imagen del medicamento */}
        <View style={styles.imageContainer}>
          {medicamento!.foto ? (
            <Image
              source={{ uri: `data:${medicamento!.tipo_mime};base64,${medicamento!.foto}` }}
              style={styles.medicamentoImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImageBox}>
              <Icon name="medkit" size={50} color="#ddd" />
              <Text style={styles.noImageText}>Sin imagen</Text>
            </View>
          )}
        </View>

        {/* Información del medicamento */}
        <View style={styles.infoContainer}>
          <Text style={styles.medicamentoName}>{medicamento!.nombreMedicamento}</Text>
          
          <View style={styles.detailRow}>
            <Icon name="tag" size={16} color="#42d68c" style={styles.detailIcon} />
            <Text style={styles.detailText}>Tipo: {medicamento!.tipo}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="barcode" size={16} color="#42d68c" style={styles.detailIcon} />
            <Text style={styles.detailText}>Referencia: {medicamento!.referencia}</Text>
          </View>
          
          {medicamento!.descripcion && (
            <View style={styles.detailRow}>
              <Icon name="file-text" size={16} color="#42d68c" style={styles.detailIcon} />
              <Text style={styles.detailText}>Descripción: {medicamento!.descripcion}</Text>
            </View>
          )}
        </View>

        {/* Disponibilidad por sede */}
        <View style={styles.availabilityContainer}>
          <Text style={styles.sectionTitle}>Disponibilidad por Sede</Text>
          
          {disponibilidades.length === 0 ? (
            <Text style={styles.noAvailabilityText}>No disponible en ninguna sede</Text>
          ) : (
            disponibilidades.map((disp) => (
              <TouchableOpacity 
                key={disp.id} 
                style={[
                  styles.sedeItem,
                  selectedSede?.id === disp.sede.id && styles.selectedSedeItem
                ]}
                onPress={() => setSelectedSede(disp.sede)}
              >
                <View style={styles.sedeInfo}>
                  <Text style={styles.sedeName}>{disp.sede.nombreSede}</Text>
                  <Text style={styles.sedeAddress}>{disp.sede.ubicacion}</Text>
                </View>
                
                <View style={styles.stockInfo}>
                  <Text style={[
                    styles.stockText,
                    disp.stock === 0 && styles.stockZero,
                    disp.stock > 0 && disp.stock <= 10 && styles.stockLow
                  ]}>
                    Stock: {disp.stock}
                  </Text>
                  <Text style={[
                    styles.statusBadge,
                    disp.estado === 'disponible' && styles.statusAvailable,
                    disp.estado === 'poco_stock' && styles.statusLow,
                    disp.estado === 'agotado' && styles.statusZero
                  ]}>
                    {disp.estado === 'disponible' ? 'Disponible' : 
                     disp.estado === 'poco_stock' ? 'Poco Stock' : 'Agotado'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Selector de cantidad */}
        {selectedSede && disponibilidadSeleccionada && disponibilidadSeleccionada.stock > 0 && (
          <View style={styles.cantidadContainer}>
            <Text style={styles.cantidadLabel}>Cantidad:</Text>
            <TextInput
              style={styles.cantidadInput}
              value={cantidad}
              onChangeText={handleCantidadChange}
              keyboardType="numeric"
              maxLength={5}
              placeholder="1"
            />
            <Text style={styles.stockMaxText}>
              Máximo: {disponibilidadSeleccionada.stock}
            </Text>
          </View>
        )}

        {/* Botón para agregar al paquete */}
        {selectedSede && disponibilidadSeleccionada && disponibilidadSeleccionada.stock > 0 && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddToPackage}
          >
            <Icon name="archive" size={20} color="white" />
            <Text style={styles.addButtonText}>Agregar al Paquete</Text>
          </TouchableOpacity>
        )}
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

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f5f5f5' 
  },
  scrollView: {
    flex: 1,
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
    alignItems: 'center' 
  },
  titleIcon: { 
    marginRight: 10 
  },
  titleText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: 'white' 
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  medicamentoImage: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 10,
  },
  noImageBox: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 10,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: 10,
    color: '#999',
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medicamentoName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailIcon: {
    marginRight: 10,
  },
  detailText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  availabilityContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  noAvailabilityText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
  sedeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedSedeItem: {
    borderColor: '#42d68c',
    backgroundColor: '#f0f9f4',
  },
  sedeInfo: {
    flex: 1,
  },
  sedeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sedeAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  stockText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stockZero: {
    color: '#ff6b6b',
  },
  stockLow: {
    color: '#f6c23e',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
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
  cantidadContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cantidadLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cantidadInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  stockMaxText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#42d68c',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default DetailScreen;