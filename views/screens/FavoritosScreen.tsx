import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { FavoritoPresenter } from '../../presenters/FavoritoPresenter';
import { MedicamentoPresenter } from '../../presenters/MedicamentoPresenter';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import AlertComponent, { AlertType } from '../components/Alert';
import Loading from '../components/Loading';
import { Favorito } from '../../models/Favorito';
import { Medicamento, Disponibilidad } from '../../models/Medicamento';
import io, { Socket } from 'socket.io-client';
import { getConfig } from '../../config/apiBase';

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

type FavoritosScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Favoritos'>;

const FavoritosScreen: React.FC = () => {
  const navigation = useNavigation<FavoritosScreenNavigationProp>();
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
  const [filteredFavoritos, setFilteredFavoritos] = useState<Favorito[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para alerta
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('info');
  
  // Estados para alerta de confirmación de eliminación
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [favoritoToDelete, setFavoritoToDelete] = useState<number | null>(null);

  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');

  const showAlert = (title: string, message: string, type: AlertType = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const loadFavoritos = useCallback(async () => {
    try {
      setLoading(true);
      const user = await AuthPresenter.getCurrentUser();
      if (!user) {
        showAlert('Error', 'Usuario no autenticado', 'error');
        setLoading(false);
        return;
      }

      // Obtener favoritos del usuario
      const favoritosData = await FavoritoPresenter.obtenerFavoritosUsuario();
      setFavoritos(favoritosData);

      // Obtener todos los medicamentos y disponibilidad para mostrar información completa
      const [medicamentosData, disponibilidadData] = await Promise.all([
        MedicamentoPresenter.getAllMedicamentos(),
        MedicamentoPresenter.getDisponibilidad()
      ]);
      
      setMedicamentos(medicamentosData);
      setDisponibilidad(disponibilidadData);
      
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Aplicar filtros cuando cambien los valores
  const applyFilters = useCallback(() => {
    let filtered = [...favoritos];

    // Filtrar por texto de búsqueda
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(favorito => {
        const medicamento = medicamentos.find(m => m.id === favorito.id_medicamento);
        return medicamento && (
          medicamento.nombreMedicamento.toLowerCase().includes(searchLower) ||
          medicamento.referencia.toLowerCase().includes(searchLower) ||
          medicamento.tipo.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filtrar por tipo
    if (selectedTipo) {
      filtered = filtered.filter(favorito => {
        const medicamento = medicamentos.find(m => m.id === favorito.id_medicamento);
        return medicamento && medicamento.tipo === selectedTipo;
      });
    }

    setFilteredFavoritos(filtered);
  }, [searchText, selectedTipo, favoritos, medicamentos]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Configurar WebSockets
  const setupWebSockets = useCallback(async () => {
    try {
      const favSocket = await initSocket();
      
      // Escuchar eventos de favoritos
      favSocket.on('favorito_agregado', async (nuevoFavorito: Favorito) => {
        const user = await AuthPresenter.getCurrentUser();
        if (user && nuevoFavorito.id_usuario === user.id) {
          loadFavoritos();
        }
      });
      
      favSocket.on('favorito_eliminado', async (data: { id_usuario: number, id_medicamento: number }) => {
        const user = await AuthPresenter.getCurrentUser();
        if (user && data.id_usuario === user.id) {
          loadFavoritos();
        }
      });
      
      // Escuchar eventos de medicamentos para actualizar stock
      favSocket.on('medicamento_actualizado', () => {
        loadFavoritos();
      });
      
      favSocket.on('disponibilidad_actualizada', () => {
        loadFavoritos();
      });
      
      favSocket.on('stock_ajustado', () => {
        loadFavoritos();
      });
      
      favSocket.on('error', (error: any) => {
        console.log('Error de WebSocket:', error);
      });
      
      return favSocket;
    } catch (error) {
      console.log('Error al configurar WebSockets:', error);
      return null;
    }
  }, [loadFavoritos]);

  useEffect(() => {
    const initializeData = async () => {
      await loadFavoritos();
      await setupWebSockets();
    };

    initializeData();

    // Cleanup al desmontar el componente
    return () => {
      if (socket) {
        socket.off('favorito_agregado');
        socket.off('favorito_eliminado');
        socket.off('medicamento_actualizado');
        socket.off('disponibilidad_actualizada');
        socket.off('stock_ajustado');
        socket.off('error');
      }
    };
  }, [loadFavoritos, setupWebSockets]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFavoritos();
  };

  // Funciones auxiliares para stock y estado
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

  const handleAlertConfirm = () => {
    setAlertVisible(false);
  };

  const handleDeleteAlertConfirm = () => {
    if (favoritoToDelete !== null) {
      confirmDeleteFavorito();
    }
    setDeleteAlertVisible(false);
    setFavoritoToDelete(null);
  };

  const handleDeleteAlertCancel = () => {
    setDeleteAlertVisible(false);
    setFavoritoToDelete(null);
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedTipo('');
  };

  const hasActiveFilters = () => {
    return searchText !== '' || selectedTipo !== '';
  };

  // Función para mostrar la alerta de eliminación
  const eliminarFavorito = (idMedicamento: number) => {
    setFavoritoToDelete(idMedicamento);
    setDeleteAlertVisible(true);
  };

  // Función para confirmar la eliminación
  const confirmDeleteFavorito = async () => {
    if (favoritoToDelete === null) return;
    
    try {
      await FavoritoPresenter.eliminarFavorito(favoritoToDelete);
      showAlert('Éxito', 'Medicamento eliminado de favoritos', 'success');
      loadFavoritos(); // Recargar la lista
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  // Obtener tipos únicos de medicamentos en favoritos
  const getTiposUnicos = () => {
    const tipos = favoritos.map(favorito => {
      const medicamento = medicamentos.find(m => m.id === favorito.id_medicamento);
      return medicamento ? medicamento.tipo : '';
    }).filter(tipo => tipo !== '');
    
    return [...new Set(tipos)];
  };

  const renderFavoritoItem = ({ item }: { item: Favorito }) => {
    const medicamento = medicamentos.find(m => m.id === item.id_medicamento);
    if (!medicamento) return null;

    const estado = getEstadoForMedicamento(medicamento.id);

    return (
      <TouchableOpacity 
        style={styles.favoritoItem}
        onPress={() => navigation.navigate('Detail', { medicamentoId: medicamento.id })}
      >
        <View style={styles.favoritoHeader}>
          <View style={styles.medicamentoInfo}>
            <Text style={styles.medicamentoName}>{medicamento.nombreMedicamento}</Text>
            <Text style={styles.medicamentoTipo}>{medicamento.tipo}</Text>
          </View>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              eliminarFavorito(medicamento.id);
            }}
            style={styles.deleteButton}
          >
            <Icon name="heart" size={20} color="#ff6b6b" />
          </TouchableOpacity>
        </View>

        <View style={styles.favoritoBody}>
          <View style={styles.medicamentoDetails}>
            <Text style={styles.detailText} numberOfLines={2}>
              {medicamento.descripcion}
            </Text>
            <Text style={styles.referenciaText}>Ref: {medicamento.referencia}</Text>
            
            <View style={[styles.statusBadge, { backgroundColor: estado.color }]}>
              <Text style={styles.statusText}>{estado.text}</Text>
            </View>
          </View>

          {medicamento.foto ? (
            <Image
              source={{ uri: `data:${medicamento.tipo_mime};base64,${medicamento.foto}` }}
              style={styles.medicamentoImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImageBox}>
              <Icon name="medkit" size={30} color="#ddd" />
              <Text style={styles.noImageText}>Sin imagen</Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.detailButton}
          onPress={() => navigation.navigate('Detail', { medicamentoId: medicamento.id })}
        >
          <Text style={styles.detailButtonText}>Ver detalles</Text>
          <Icon name="chevron-right" size={14} color="#42d68c" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
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
          <Icon name="heart" size={30} color="white" style={styles.titleIcon} />
          <Text style={styles.titleText}>Mis Favoritos</Text>
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.headerButton, hasActiveFilters() && styles.activeFilterButton]}
            onPress={() => setShowFilters(true)}
          >
            <Icon name="filter" size={20} color={hasActiveFilters() ? '#42d68c' : 'white'} />
            {hasActiveFilters() && <View style={styles.filterIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={loadFavoritos}
          >
            <Icon name="refresh" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, referencia o tipo..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />
        {searchText !== '' && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Icon name="times-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {filteredFavoritos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="heart-o" size={50} color="#ddd" />
          <Text style={styles.emptyText}>
            {hasActiveFilters() 
              ? 'No hay favoritos que coincidan con los filtros' 
              : 'No tienes medicamentos en favoritos'
            }
          </Text>
          <Text style={styles.emptySubtext}>
            {hasActiveFilters() 
              ? 'Intenta con otros criterios de búsqueda' 
              : 'Agrega medicamentos a favoritos desde la pantalla de medicamentos'
            }
          </Text>
          {hasActiveFilters() && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredFavoritos}
          renderItem={renderFavoritoItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#42d68c']}
              tintColor={'#42d68c'}
            />
          }
        />
      )}

      {/* Modal de Filtros */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar Favoritos</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Filtro por Tipo */}
              <Text style={styles.filterLabel}>Tipo de Medicamento</Text>
              
              <View style={styles.tipoContainer}>
                <TouchableOpacity 
                  style={[styles.tipoButton, selectedTipo === '' && styles.tipoButtonSelected]}
                  onPress={() => setSelectedTipo('')}
                >
                  <Text style={[styles.tipoText, selectedTipo === '' && styles.tipoTextSelected]}>
                    Todos los tipos
                  </Text>
                </TouchableOpacity>
                
                {getTiposUnicos().map((tipo) => (
                  <TouchableOpacity 
                    key={tipo}
                    style={[styles.tipoButton, selectedTipo === tipo && styles.tipoButtonSelected]}
                    onPress={() => setSelectedTipo(tipo)}
                  >
                    <Text style={[styles.tipoText, selectedTipo === tipo && styles.tipoTextSelected]}>
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.clearFiltersButtonModal}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersTextModal}>Limpiar Filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyFiltersButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyFiltersText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Alert Component para mensajes generales */}
      <AlertComponent
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        confirmText="Aceptar"
        onConfirm={handleAlertConfirm}
        onClose={handleAlertConfirm}
      />

      {/* Alert Component para confirmación de eliminación */}
      <AlertComponent
        visible={deleteAlertVisible}
        title="Eliminar de Favoritos"
        message="¿Estás seguro de que deseas eliminar este medicamento de tus favoritos?"
        type="confirmation"
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteAlertConfirm}
        onCancel={handleDeleteAlertCancel}
        onClose={handleDeleteAlertCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 18, 
    fontWeight: 'bold', 
    color: 'white' 
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 10,
    marginLeft: 5,
    position: 'relative',
  },
  activeFilterButton: {
    backgroundColor: 'white',
    borderRadius: 20,
  },
  filterIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#42d68c',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 50,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#42d68c',
    borderRadius: 20,
  },
  clearFiltersText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
  },
  favoritoItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  favoritoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  medicamentoInfo: {
    flex: 1,
  },
  medicamentoName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  medicamentoTipo: {
    fontSize: 14,
    color: '#42d68c',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 5,
    marginLeft: 10,
  },
  favoritoBody: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  medicamentoDetails: {
    flex: 1,
    marginRight: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  referenciaText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  medicamentoImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  noImageBox: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 5,
  },
  detailButtonText: {
    color: '#42d68c',
    fontWeight: 'bold',
    marginRight: 5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  tipoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tipoButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    marginBottom: 10,
  },
  tipoButtonSelected: {
    backgroundColor: '#42d68c',
    borderColor: '#42d68c',
  },
  tipoText: {
    fontSize: 14,
    color: '#666',
  },
  tipoTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  clearFiltersButtonModal: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  clearFiltersTextModal: {
    color: '#666',
  },
  applyFiltersButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#42d68c',
    borderRadius: 8,
  },
  applyFiltersText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default FavoritosScreen;