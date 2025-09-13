import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { MedicamentoPresenter } from '../../presenters/MedicamentoPresenter';
import { Medicamento, Disponibilidad } from '../../models/Medicamento';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import Alert, { AlertType } from '../components/Alert';
import Loading from '../components/Loading';
import io, { Socket } from 'socket.io-client';
import { getConfig } from '../../config/apiBase';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import { RecoleccionCarrito } from '../../models/Recoleccion';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

type MedicamentosScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Medicamentos'>;

const MedicamentosScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const [carritoCount, setCarritoCount] = useState(0);
  const navigation = useNavigation<MedicamentosScreenNavigationProp>();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6;

  const [search, setSearch] = useState("");

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

  const loadMedicamentos = useCallback(async () => {
    try {
      setLoading(true);
      const medicamentosData = await MedicamentoPresenter.getAllMedicamentos();
      const disponibilidadData = await MedicamentoPresenter.getDisponibilidad();
      
      setMedicamentos(medicamentosData);
      setDisponibilidad(disponibilidadData);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const setupWebSockets = useCallback(async () => {
    try {
      const medSocket = await initSocket();
      
      // Escuchar eventos de medicamentos
      medSocket.on('medicamento_creado', (nuevoMedicamento: Medicamento) => {
        setMedicamentos(prev => [...prev, nuevoMedicamento]);
      });
      
      medSocket.on('medicamento_actualizado', (medicamentoActualizado: Medicamento) => {
        setMedicamentos(prev => 
          prev.map(med => 
            med.id === medicamentoActualizado.id ? medicamentoActualizado : med
          )
        );
      });
      
      medSocket.on('medicamento_eliminado', (data: { id: number }) => {
        setMedicamentos(prev => prev.filter(med => med.id !== data.id));
      });
      
      // Escuchar eventos de disponibilidad
      medSocket.on('disponibilidad_creada', (nuevaDisponibilidad: Disponibilidad) => {
        setDisponibilidad(prev => [...prev, nuevaDisponibilidad]);
      });
      
      medSocket.on('disponibilidad_actualizada', (disponibilidadActualizada: Disponibilidad) => {
        setDisponibilidad(prev => 
          prev.map(disp => 
            disp.id === disponibilidadActualizada.id ? disponibilidadActualizada : disp
          )
        );
        // Actualizar también la lista de medicamentos para reflejar cambios de stock
        loadMedicamentos();
      });
      
      medSocket.on('disponibilidad_eliminada', (data: { id: number }) => {
        setDisponibilidad(prev => prev.filter(disp => disp.id !== data.id));
      });
      
      medSocket.on('stock_ajustado', () => {
        // Actualizar la disponibilidad cuando se ajusta el stock
        loadMedicamentos();
      });
      
      medSocket.on('medicamento_consumido', () => {
        // Actualizar la disponibilidad cuando se consume un medicamento
        loadMedicamentos();
      });
      
      medSocket.on('alerta_stock_bajo', (data: any) => {
        showAlert('Stock Bajo', data.mensaje || `Stock bajo de ${data.medicamento} en ${data.sede}: ${data.stock_actual} unidades restantes`, 'warning');
      });
      
      medSocket.on('error', (error: any) => {
        console.log('Error de WebSocket:', error);
      });
      
      return medSocket;
    } catch (error) {
      console.log('Error al configurar WebSockets:', error);
      return null;
    }
  }, [loadMedicamentos]);

  useEffect(() => {
    const initializeData = async () => {
      await loadMedicamentos();
      
      // Configurar WebSockets después de cargar los datos
      await setupWebSockets();
    };

    initializeData();

    // Cleanup al desmontar el componente
    return () => {
      if (socket) {
        socket.off('medicamento_creado');
        socket.off('medicamento_actualizado');
        socket.off('medicamento_eliminado');
        socket.off('disponibilidad_creada');
        socket.off('disponibilidad_actualizada');
        socket.off('disponibilidad_eliminada');
        socket.off('stock_ajustado');
        socket.off('medicamento_consumido');
        socket.off('alerta_stock_bajo');
        socket.off('error');
      }
    };
  }, [loadMedicamentos, setupWebSockets]);

  useEffect(() => {
  const loadCarritoCount = async () => {
    try {
      const carritoStr = await AsyncStorage.getItem('carrito');
      if (carritoStr) {
        const carrito: RecoleccionCarrito[] = JSON.parse(carritoStr);
        setCarritoCount(carrito.length);
      } else {
        setCarritoCount(0);
      }
    } catch (error) {
      console.log('Error al cargar el carrito:', error);
    }
  };

  if (isFocused) {
    loadCarritoCount();
  }
}, [isFocused]);

const getStockForMedicamento = (medicamentoId: number): number => {
  const disponibilidadesMedicamento = disponibilidad.filter(d => d.id_medicamento === medicamentoId);
  return disponibilidadesMedicamento.reduce((total, disp) => total + disp.stock, 0);
};

const getEstadoForMedicamento = (medicamentoId: number): { text: string, color: string } => {
  const stockTotal = getStockForMedicamento(medicamentoId);
  
  if (stockTotal === 0) return { text: "Agotado", color: "#ff6b6b" }; // rojo
  if (stockTotal <= 10) return { text: "Poco stock", color: "#f6c23e" }; // amarillo
  return { text: "Disponible", color: "#42d68c" }; // verde
};


const renderMedicamentoItem = ({ item }: { item: Medicamento }) => {
  const estado = getEstadoForMedicamento(item.id);

  return (
    <TouchableOpacity 
      style={styles.medicamentoCard}
      onPress={() => navigation.navigate('Detail', { medicamentoId: item.id })}
    >
      {/* Encabezado */}
      <View style={styles.medicamentoHeader}>
        <Icon name="medkit" size={20} color="#42d68c" />
        <Text style={styles.medicamentoName} numberOfLines={1}>
          {item.nombreMedicamento}
        </Text>
        {/* Botón para ir a detalles */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Detail', { medicamentoId: item.id })}
          style={styles.detailButton}
        >
          <Icon name="info-circle" size={20} color="#42d68c" />
        </TouchableOpacity>
      </View>

      {/* Cuerpo con texto e imagen */}
      <View style={styles.medicamentoBody}>
        <View style={styles.medicamentoInfo}>
          <Text style={styles.detailText}>Tipo: {item.tipo}</Text>
          <Text style={styles.detailText} numberOfLines={3}>
            {item.descripcion}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: estado.color }]}>
            <Text style={styles.statusText}>{estado.text}</Text>
          </View>
        </View>

        {item.foto ? (
          <Image
            source={{ uri: `data:${item.tipo_mime};base64,${item.foto}` }}
            style={styles.medicamentoImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImageBox}>
            <Text style={styles.noImageText}>Sin imagen</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

  const filteredMedicamentos = medicamentos.filter(m =>
    m.nombreMedicamento.toLowerCase().includes(search.toLowerCase()) ||
    m.referencia.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredMedicamentos.length / itemsPerPage);
  const currentItems = filteredMedicamentos.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

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
          <Icon name="medkit" size={30} color="white" style={styles.titleIcon} />
          <Text style={styles.titleText}>Medicamentos</Text>
        </View>
      </LinearGradient>
      
      {/* Filtro */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar medicamento..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* Contenido con ScrollView */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {filteredMedicamentos.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="medkit" size={50} color="#ddd" />
            <Text style={styles.emptyStateText}>No se encontraron medicamentos</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={currentItems}
              renderItem={renderMedicamentoItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              scrollEnabled={false} 
            />
            
            {/* Paginación */}
            <View style={styles.pagination}>
              <TouchableOpacity 
                style={[styles.paginationButton, currentPage === 0 && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(prev => prev - 1)}
                disabled={currentPage === 0}
              >
                <Icon name="chevron-left" size={20} color={currentPage === 0 ? "#ccc" : "#42d68c"} />
              </TouchableOpacity>
              
              <Text style={styles.paginationText}>
                Página {currentPage + 1} de {totalPages}
              </Text>
              
              <TouchableOpacity 
                style={[styles.paginationButton, currentPage === totalPages - 1 && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage === totalPages - 1}
              >
                <Icon name="chevron-right" size={20} color={currentPage === totalPages - 1 ? "#ccc" : "#42d68c"} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer con margen superior */}
      <View style={styles.footer}>
        <Image 
          source={require('../../img/logo-green.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        <TouchableOpacity 
  style={styles.boxButton}
  onPress={() => navigation.navigate('Package')}
>
  <Icon name="archive" size={20} color="white" />
  {carritoCount > 0 && (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{carritoCount}</Text>
    </View>
  )}
</TouchableOpacity>
      </View>

      {/* Alert */}
      <Alert
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

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f5f5f5' 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 15,
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
    fontSize: 24, 
    fontWeight: 'bold', 
    color: 'white' 
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: { 
    flex: 1,
    height: 60,
    fontSize: 14,
    color: '#333' 
  },
  searchIcon: {
    marginRight: 8,
  },

  content: { 
    flex: 1, 
    paddingHorizontal: 15 
  },
  listContainer: { 
    paddingBottom: 15 
  },

medicamentoCard: {
  backgroundColor: 'white',
  borderRadius: 10,
  padding: 15,
  marginBottom: 15,
  marginHorizontal: 15,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 3,
  elevation: 3,
},
medicamentoHeader: {
  flexDirection: 'row', 
  alignItems: 'center',
  marginBottom: 10, 
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0', 
  paddingBottom: 8,
},
detailButton: {
  padding: 5,
  marginLeft: 10,
},
  medicamentoName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
    color: '#333',
  },
  medicamentoBody: {
    flexDirection: 'row',
    alignItems: 'flex-start' 
  },
  medicamentoInfo: {
    flex: 1,
  },

  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5 
  },
  stockText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 5 
  },

  medicamentoImage: { 
    width: 90, 
    height: 90, 
    borderRadius: 8, 
    marginLeft: 10 
  },
  noImageBox: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  noImageText: { 
    fontSize: 12,
    color: 'gray',
    fontStyle: 'italic' 
  },

  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { 
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold' 
  },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 1,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 5,
    marginHorizontal:12
  },
  paginationButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f0f0f0' 
  },
  paginationButtonDisabled: {
    opacity: 0.5 
  },
  paginationText: { 
    fontSize: 14,
    color: '#666' 
  },

  emptyState: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50 
  },
  emptyStateText: { 
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    textAlign: 'center' 
  },
  footer: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: width * 0.1,  // 10% del ancho de pantalla
    paddingVertical: height * 0.01,  // 2% de alto
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1, 
    borderTopColor: 'rgba(66, 214, 140, 0.1)',
    marginBottom: height * 0.05
  },
 logo: { 
    width: width * 0.45,   // 45% del ancho total
    height: height * 0.1,  // 10% de la altura total
    resizeMode: 'contain',
  },
  boxButton: {
    backgroundColor: '#42d68c',
    width: width * 0.12,   // 12% del ancho
    height: width * 0.12,  // Mantener cuadrado
    borderRadius: (width * 0.12) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  badge: {
  position: 'absolute',
  top: -5,
  right: -5,
  backgroundColor: 'red',
  borderRadius: 10,
  minWidth: 20,
  height: 20,
  justifyContent: 'center',
  alignItems: 'center',
},
badgeText: {
  color: 'white',
  fontSize: 12,
  fontWeight: 'bold',
},
});

export default MedicamentosScreen;