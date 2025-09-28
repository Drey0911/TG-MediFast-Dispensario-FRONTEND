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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { RecoleccionPresenter } from '../../presenters/RecoleccionPresenter';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import AlertComponent, { AlertType } from '../components/Alert';
import Loading from '../components/Loading';
import { Recoleccion } from '../../models/Recoleccion'; 
import { RecoleccionAgrupada } from '../../models/Recoleccion';
import DateTimePicker from '@react-native-community/datetimepicker';

type HistorialScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Historial'>;

const HistorialScreen: React.FC = () => {
  const navigation = useNavigation<HistorialScreenNavigationProp>();
  const [recolecciones, setRecolecciones] = useState<RecoleccionAgrupada[]>([]);
  const [filteredRecolecciones, setFilteredRecolecciones] = useState<RecoleccionAgrupada[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para alerta
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('info');

  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const showAlert = (title: string, message: string, type: AlertType = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const loadRecolecciones = useCallback(async () => {
    try {
      setLoading(true);
      const user = await AuthPresenter.getCurrentUser();
      if (!user) {
        showAlert('Error', 'Usuario no autenticado', 'error');
        setLoading(false);
        return;
      }

      // Obtener recolecciones del usuario cuyo estado sea distinto de 0 (todas menos programadas)
      const recoleccionesData = (await RecoleccionPresenter.getRecoleccionesByUsuario(user.id))
        .filter((recoleccion: Recoleccion) => recoleccion.cumplimiento !== 0);
        
      // Agrupar recolecciones por NoRecoleccion
      const recoleccionesAgrupadas: RecoleccionAgrupada[] = [];
      const grupos: { [key: string]: RecoleccionAgrupada } = {};

      recoleccionesData.forEach((recoleccion: Recoleccion) => {
        if (!grupos[recoleccion.NoRecoleccion]) {
          grupos[recoleccion.NoRecoleccion] = {
            NoRecoleccion: recoleccion.NoRecoleccion,
            fechaRecoleccion: recoleccion.fechaRecoleccion,
            horaRecoleccion: recoleccion.horaRecoleccion,
            horaVencimiento: recoleccion.horaVencimiento,
            cumplimiento: recoleccion.cumplimiento,
            sede: recoleccion.sede || { 
              id: 0, 
              nombreSede: 'Sede no disponible', 
              ubicacion: 'Ubicación no disponible' 
            },
            medicamentos: []
          };
        }

        // Agregar medicamento a la recolección agrupada
        if (recoleccion.medicamento) {
          grupos[recoleccion.NoRecoleccion].medicamentos.push({
            id: recoleccion.medicamento.id,
            nombre: recoleccion.medicamento.nombreMedicamento || 'Medicamento sin nombre',
            cantidad: recoleccion.cantidad
          });
        }
      });

      // Convertir objeto a array
      Object.keys(grupos).forEach(key => {
        recoleccionesAgrupadas.push(grupos[key]);
      });

      setRecolecciones(recoleccionesAgrupadas);
      setFilteredRecolecciones(recoleccionesAgrupadas);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecolecciones();
  }, [loadRecolecciones]);

  // Aplicar filtros cuando cambien los valores
  const applyFilters = useCallback(() => {
    let filtered = [...recolecciones];

    // Filtrar por texto de búsqueda
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(item => 
        item.NoRecoleccion.toLowerCase().includes(searchLower) ||
        item.sede.nombreSede.toLowerCase().includes(searchLower) ||
        item.sede.ubicacion.toLowerCase().includes(searchLower) ||
        item.medicamentos.some(med => med.nombre.toLowerCase().includes(searchLower))
      );
    }

    // Filtrar por estado
    if (selectedStatus !== null) {
      filtered = filtered.filter(item => item.cumplimiento === selectedStatus);
    }

    // Filtrar por rango de fechas
    if (startDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.fechaRecoleccion);
        return itemDate >= startDate;
      });
    }

    if (endDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.fechaRecoleccion);
        // Añadir un día para incluir la fecha final
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        return itemDate < endDatePlusOne;
      });
    }

    setFilteredRecolecciones(filtered);
  }, [searchText, selectedStatus, startDate, endDate, recolecciones]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRecolecciones();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const time = timeString.split(':');
    return `${time[0]}:${time[1]}`;
  };

  const getEstadoText = (estado: number) => {
    switch (estado) {
      case 0: return 'Programada';
      case 1: return 'Completada';
      case 3: return 'Vencida';
      case 4: return 'Cancelada';
      default: return 'Desconocido';
    }
  };

  const getEstadoColor = (estado: number) => {
    switch (estado) {
      case 1: return '#42d68c'; // Completada - verde
      case 3: return '#ff6b6b'; // Vencida - rojo
      case 4: return '#6c757d'; // Cancelada - gris
      default: return '#6c757d'; // Desconocido - gris
    }
  };

  const handleAlertConfirm = () => {
    setAlertVisible(false);
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedStatus(null);
    setStartDate(null);
    setEndDate(null);
  };

  const hasActiveFilters = () => {
    return searchText !== '' || selectedStatus !== null || startDate !== null || endDate !== null;
  };

  const renderRecoleccionItem = ({ item }: { item: RecoleccionAgrupada }) => (
    <View style={styles.recoleccionItem}>
      <View style={styles.recoleccionHeader}>
        <View style={styles.recoleccionNumberContainer}>
          <Icon name="hashtag" size={16} color="#42d68c" />
          <Text style={styles.recoleccionNumber}>{item.NoRecoleccion}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getEstadoColor(item.cumplimiento) }]}>
          <Text style={styles.statusText}>{getEstadoText(item.cumplimiento)}</Text>
        </View>
      </View>

      <View style={styles.recoleccionInfo}>
        <Text style={styles.sedeName}>{item.sede.nombreSede}</Text>
        <Text style={styles.sedeUbicacion}>{item.sede.ubicacion}</Text>
        
        {/* Lista de medicamentos */}
        <View style={styles.medicamentosContainer}>
          <Text style={styles.medicamentosTitle}>Medicamentos:</Text>
          {item.medicamentos.map((medicamento) => (
            <View key={medicamento.id} style={styles.medicamentoItem}>
              <Text style={styles.medicamentoText}>
                {medicamento.cantidad}x {medicamento.nombre}
              </Text>
            </View>
          ))}
        </View>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Icon name="calendar" size={14} color="#666" />
            <Text style={styles.detailText}>{formatDate(item.fechaRecoleccion)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="clock-o" size={14} color="#666" />
            <Text style={styles.detailText}>
              {formatTime(item.horaRecoleccion)} - {formatTime(item.horaVencimiento)}
            </Text>
          </View>
        </View>
      </View>
    </View>
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
          <Icon name="history" size={30} color="white" style={styles.titleIcon} />
          <Text style={styles.titleText}>Historial</Text>
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.headerButton, hasActiveFilters() && styles.activeFilterButton]}
            onPress={() => setShowFilters(true)}
          >
            <Icon name="filter" size={20} color={hasActiveFilters() ? 'white' : 'white'} />
            {hasActiveFilters() && <View style={styles.filterIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={loadRecolecciones}
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
          placeholder="Buscar por número, sede o medicamento..."
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

      {filteredRecolecciones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="inbox" size={50} color="#ddd" />
          <Text style={styles.emptyText}>
            {hasActiveFilters() 
              ? 'No hay recolecciones que coincidan con los filtros' 
              : 'No tienes recolecciones pasadas'
            }
          </Text>
          <Text style={styles.emptySubtext}>
            {hasActiveFilters() 
              ? 'Intenta con otros criterios de búsqueda' 
              : 'Agenda recolecciones desde la pantalla de medicamentos'
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
          data={filteredRecolecciones}
          renderItem={renderRecoleccionItem}
          keyExtractor={(item) => item.NoRecoleccion}
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
              <Text style={styles.modalTitle}>Filtrar Historial</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Filtro por Estado */}
              <Text style={styles.filterLabel}>Estado</Text>
              <View style={styles.statusFilterContainer}>
                {[
                  { value: 1, label: 'Completada', color: '#42d68c' },
                  { value: 3, label: 'Vencida', color: '#ff6b6b' },
                  { value: 4, label: 'Cancelada', color: '#6c757d' },
                ].map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.statusFilterButton,
                      selectedStatus === status.value && styles.statusFilterButtonActive,
                      { borderColor: status.color }
                    ]}
                    onPress={() => setSelectedStatus(selectedStatus === status.value ? null : status.value)}
                  >
                    <Text
                      style={[
                        styles.statusFilterText,
                        selectedStatus === status.value && { color: status.color }
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Filtro por Fecha */}
              <Text style={styles.filterLabel}>Rango de Fechas</Text>
              
              <Text style={styles.dateLabel}>Desde:</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Icon name="calendar" size={16} color="#666" />
                <Text style={styles.dateText}>
                  {startDate ? formatDate(startDate.toISOString()) : 'Seleccionar fecha'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.dateLabel}>Hasta:</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Icon name="calendar" size={16} color="#666" />
                <Text style={styles.dateText}>
                  {endDate ? formatDate(endDate.toISOString()) : 'Seleccionar fecha'}
                </Text>
              </TouchableOpacity>

              {(startDate || endDate) && (
                <TouchableOpacity 
                  style={styles.clearDateButton}
                  onPress={() => {
                    setStartDate(null);
                    setEndDate(null);
                  }}
                >
                  <Text style={styles.clearDateText}>Limpiar fechas</Text>
                </TouchableOpacity>
              )}
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

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowStartDatePicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}
      
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEndDatePicker(false);
            if (date) setEndDate(date);
          }}
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
    borderRadius: 20,
  },
  filterIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
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
  recoleccionItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  recoleccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recoleccionNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recoleccionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#42d68c',
    marginLeft: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  recoleccionInfo: {
    flex: 1,
  },
  sedeName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  sedeUbicacion: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  medicamentosContainer: {
    marginBottom: 10,
  },
  medicamentosTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  medicamentoItem: {
    marginLeft: 10,
    marginBottom: 3,
  },
  medicamentoText: {
    fontSize: 14,
    color: '#666',
  },
  detailsContainer: {
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
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
    maxHeight: '80%',
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
    marginBottom: 10,
    color: '#333',
  },
  statusFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  statusFilterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
    marginBottom: 10,
  },
  statusFilterButtonActive: {
    backgroundColor: '#f0f0f0',
  },
  statusFilterText: {
    fontSize: 14,
    color: '#666',
  },
  dateLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  dateText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  clearDateButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  clearDateText: {
    color: '#42d68c',
    fontSize: 14,
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

export default HistorialScreen;