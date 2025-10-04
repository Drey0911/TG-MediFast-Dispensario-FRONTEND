import React, { useState, useEffect} from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  TextInput,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { MedicamentoPresenter } from '../../presenters/MedicamentoPresenter';
import { FavoritoPresenter } from '../../presenters/FavoritoPresenter';
import { Medicamento, Disponibilidad } from '../../models/Medicamento';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import AlertComponent, { AlertType } from '../components/Alert';
import Loading from '../components/Loading';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import { RecoleccionCarrito } from '../../models/Recoleccion';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type MedicamentosScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Medicamentos'>;

const MedicamentosScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const [carritoCount, setCarritoCount] = useState(0);
  const navigation = useNavigation<MedicamentosScreenNavigationProp>();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
  const [favoritos, setFavoritos] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6;
  const [search, setSearch] = useState("");

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('info');
  const [medicamentoEnProceso, setMedicamentoEnProceso] = useState<{id: number, nombre: string} | null>(null);

  const showAlert = (title: string, message: string, type: AlertType = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  // Toggle favorito
  const toggleFavorito = async (medicamentoId: number, medicamentoNombre: string) => {
    try {
      if (!currentUser) {
        showAlert('Error', 'Debes iniciar sesión para usar favoritos', 'error');
        return;
      }

      const esFavorito = favoritos.includes(medicamentoId);
      
      if (esFavorito) {
        await FavoritoPresenter.eliminarFavorito(medicamentoId);
        setFavoritos(prev => prev.filter(id => id !== medicamentoId));
        showAlert('Éxito', 'Medicamento eliminado de favoritos', 'success');
      } else {
        setAlertTitle('Agregar a Favoritos');
        setAlertMessage(`¿Deseas agregar "${medicamentoNombre}" a favoritos? Recibirás un aviso cuando su stock esté disponible.`);
        setAlertType('confirmation');
        setMedicamentoEnProceso({ id: medicamentoId, nombre: medicamentoNombre });
        setAlertVisible(true);
      }
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  // Función para manejar la confirmación del AlertComponent
  const handleConfirmarFavorito = async () => {
    if (!medicamentoEnProceso) return;
    
    try {
      await FavoritoPresenter.agregarFavorito(medicamentoEnProceso.id);
      setFavoritos(prev => [...prev, medicamentoEnProceso.id]);
      setMedicamentoEnProceso(null);
      setAlertVisible(false);
      showAlert('Éxito', 'Medicamento agregado a favoritos', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  // Función para manejar la cancelación del AlertComponent
  const handleCancelarFavorito = () => {
    setMedicamentoEnProceso(null);
    setAlertVisible(false);
  };

  // Cargar count del carrito
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

  // useEffect principal 
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('Cargando datos iniciales...');
        setLoading(true);
        
        const user = await AuthPresenter.getCurrentUser();
        setCurrentUser(user);
        
        const [medicamentosData, disponibilidadData] = await Promise.all([
          MedicamentoPresenter.getAllMedicamentos(),
          MedicamentoPresenter.getDisponibilidad()
        ]);
        
        setMedicamentos(medicamentosData);
        setDisponibilidad(disponibilidadData);
        
        if (user) {
          try {
            const favoritosData = await FavoritoPresenter.obtenerFavoritosUsuario();
            const idsFavoritos = favoritosData.map(fav => fav.id_medicamento);
            setFavoritos(idsFavoritos);
          } catch (error) {
            console.log('Error cargando favoritos:', error);
          }
        }
        
      } catch (error: any) {
        console.log('Error en loadInitialData:', error);
        showAlert('Error', 'No se pudieron cargar los medicamentos', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
    loadCarritoCount();
  }, []); 

  // Efecto para recargar cuando la pantalla está enfocada
  useEffect(() => {
    if (isFocused) {
      loadCarritoCount();
      
      const recargarEnFoco = async () => {
        try {
          const user = await AuthPresenter.getCurrentUser();
          const [medicamentosData, disponibilidadData] = await Promise.all([
            MedicamentoPresenter.getAllMedicamentos(),
            MedicamentoPresenter.getDisponibilidad()
          ]);
          
          setCurrentUser(user);
          setMedicamentos(medicamentosData);
          setDisponibilidad(disponibilidadData);
          
          if (user) {
            const favoritosData = await FavoritoPresenter.obtenerFavoritosUsuario();
            setFavoritos(favoritosData.map(fav => fav.id_medicamento));
          }
        } catch (error) {
          console.log('Error recargando en foco:', error);
        }
      };

      recargarEnFoco();
    }
  }, [isFocused]);

  // Funciones auxiliares
  const getStockForMedicamento = (medicamentoId: number): number => {
    const disponibilidadesMedicamento = disponibilidad.filter(d => d.id_medicamento === medicamentoId);
    return disponibilidadesMedicamento.reduce((total, disp) => total + disp.stock, 0);
  };

  const getEstadoForMedicamento = (medicamentoId: number): { text: string, color: string } => {
    const stockTotal = getStockForMedicamento(medicamentoId);
    
    if (stockTotal === 0) return { text: "Agotado", color: "#ff6b6b" };
    if (stockTotal <= 10) return { text: "Poco stock", color: "#f6c23e" };
    return { text: "Disponible", color: "#42d68c" };
  };

  // Render item
  const renderMedicamentoItem = ({ item }: { item: Medicamento }) => {
    const estado = getEstadoForMedicamento(item.id);
    const esFavorito = favoritos.includes(item.id);

    return (
      <TouchableOpacity 
        style={styles.medicamentoCard}
        onPress={() => navigation.navigate('Detail', { medicamentoId: item.id })}
      >
        <View style={styles.medicamentoHeader}>
          <Icon name="medkit" size={20} color="#42d68c" />
          <Text style={styles.medicamentoName} numberOfLines={1}>
            {item.nombreMedicamento}
          </Text>
          
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorito(item.id, item.nombreMedicamento);
            }}
            style={styles.favoriteButton}
          >
            <Icon 
              name={esFavorito ? "heart" : "heart-o"} 
              size={20} 
              color={esFavorito ? "#ff6b6b" : "#42d68c"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('Detail', { medicamentoId: item.id });
            }}
            style={styles.detailButton}
          >
            <Icon name="info-circle" size={20} color="#42d68c" />
          </TouchableOpacity>
        </View>

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

  // Filtrado y paginación
  const filteredMedicamentos = medicamentos.filter(m =>
    m.nombreMedicamento.toLowerCase().includes(search.toLowerCase()) ||
    m.referencia.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredMedicamentos.length / itemsPerPage);
  const currentItems = filteredMedicamentos.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  // Loading state
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Icon name="medkit" size={24} color="white" style={styles.titleIcon} />
          <Text style={styles.titleText}>Medicamentos</Text>
        </View>
      </LinearGradient>
      
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar medicamento..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

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
            
            <View style={styles.pagination}>
              <TouchableOpacity 
                style={[styles.paginationButton, currentPage === 0 && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
              >
                <Icon name="chevron-left" size={20} color={currentPage === 0 ? "#ccc" : "#42d68c"} />
              </TouchableOpacity>
              
              <Text style={styles.paginationText}>
                Página {currentPage + 1} de {totalPages}
              </Text>
              
              <TouchableOpacity 
                style={[styles.paginationButton, currentPage === totalPages - 1 && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <Icon name="chevron-right" size={20} color={currentPage === totalPages - 1 ? "#ccc" : "#42d68c"} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

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

      {/* Alert para confirmación de favoritos */}
      <AlertComponent
        visible={alertVisible && alertType === 'confirmation'}
        title={alertTitle}
        message={alertMessage}
        type="confirmation"
        confirmText="Agregar"
        cancelText="Cancelar"
        onConfirm={handleConfirmarFavorito}
        onCancel={handleCancelarFavorito}
        onClose={handleCancelarFavorito}
      />

      {/* Alert para mensajes normales */}
      <AlertComponent
        visible={alertVisible && alertType !== 'confirmation'}
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
    favoriteButton: {
    padding: 8,
    marginRight: 8,
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
    paddingHorizontal: width * 0.1, 
    paddingVertical: height * 0.01,  
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1, 
    borderTopColor: 'rgba(66, 214, 140, 0.1)',
    marginBottom: height * 0.05
  },
 logo: { 
    width: width * 0.45, 
    height: height * 0.1, 
    resizeMode: 'contain',
  },
  boxButton: {
    backgroundColor: '#42d68c',
    width: width * 0.12, 
    height: width * 0.12,
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