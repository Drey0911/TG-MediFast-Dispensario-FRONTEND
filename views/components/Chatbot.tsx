import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { MensajeChatbot, RespuestaChatbot } from '../../models/Chatbot';
import { ChatbotPresenter } from '../../presenters/ChatbotPresenter';
import Icon from 'react-native-vector-icons/FontAwesome';


interface ChatbotProps {
  visible: boolean;
  onClose: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ visible, onClose }) => {
  const [mensajes, setMensajes] = useState<MensajeChatbot[]>([
    {
      id: '1',
      mensaje: '¡Hola! Soy tu asistente virtual MediBOT. ¿En qué puedo ayudarte hoy? Por ejemplo, puedes preguntarme por medicamentos, stock o sedes disponibles.',
      esUsuario: false,
      timestamp: new Date()
    }
  ]);
  const [mensajeActual, setMensajeActual] = useState('');
  const [cargando, setCargando] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (mensajes.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [mensajes]);

  const enviarMensaje = async () => {
    if (!mensajeActual.trim() || cargando) return;

    const mensajeUsuario: MensajeChatbot = {
      id: Date.now().toString(),
      mensaje: mensajeActual,
      esUsuario: true,
      timestamp: new Date()
    };

    setMensajes(prev => [...prev, mensajeUsuario]);
    setMensajeActual('');
    setCargando(true);

    try {
      const respuesta: RespuestaChatbot = await ChatbotPresenter.enviarMensaje(mensajeActual);
      
      const mensajeBot: MensajeChatbot = {
        id: (Date.now() + 1).toString(),
        mensaje: respuesta.respuesta,
        esUsuario: false,
        timestamp: new Date(respuesta.timestamp),
        medicamentosRelevantes: respuesta.medicamentos_relevantes
      };

      setMensajes(prev => [...prev, mensajeBot]);
    } catch (error: any) {
      const mensajeError: MensajeChatbot = {
        id: (Date.now() + 1).toString(),
        mensaje: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.',
        esUsuario: false,
        timestamp: new Date()
      };
      setMensajes(prev => [...prev, mensajeError]);
    } finally {
      setCargando(false);
    }
  };

  const renderMensaje = ({ item }: { item: MensajeChatbot }) => (
    <View style={[
      styles.mensajeContainer,
      item.esUsuario ? styles.mensajeUsuario : styles.mensajeBot
    ]}>
      <View style={[
        styles.mensajeBurbuja,
        item.esUsuario ? styles.burbujaUsuario : styles.burbujaBot
      ]}>
        <Text style={[
          styles.mensajeTexto,
          item.esUsuario ? styles.mensajeTextoUsuario : styles.mensajeTextoBot
        ]}>
          {item.mensaje}
        </Text>
        
        {item.medicamentosRelevantes && item.medicamentosRelevantes.length > 0 && (
          <View style={styles.medicamentosContainer}>
            <Text style={styles.medicamentosTitulo}>Medicamentos mencionados:</Text>
            {item.medicamentosRelevantes.map((med, index) => (
              <View key={index} style={styles.medicamentoItem}>
                <Text style={styles.medicamentoNombre}>{med.nombre}</Text>
                <Text style={styles.medicamentoInfo}>Sede: {med.sede}</Text>
                <Text style={styles.medicamentoInfo}>Stock: {med.stock} unidades</Text>
                <Text style={styles.medicamentoEstado}>Estado: {med.estado}</Text>
              </View>
            ))}
          </View>
        )}
        
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Icon name="medkit" size={24} color="#42d68c" />
            <Text style={styles.headerTitle}>MediFast - Chat BOT</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="times" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Lista de mensajes */}
        <FlatList
          ref={flatListRef}
          data={mensajes}
          renderItem={renderMensaje}
          keyExtractor={(item) => item.id}
          style={styles.mensajesList}
          contentContainerStyle={styles.mensajesContent}
        />

        {/* Input area */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.textInput}
            value={mensajeActual}
            onChangeText={setMensajeActual}
            placeholder="Escribe tu mensaje..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[
              styles.enviarButton,
              (!mensajeActual.trim() || cargando) && styles.enviarButtonDisabled
            ]}
            onPress={enviarMensaje}
            disabled={!mensajeActual.trim() || cargando}
          >
            {cargando ? (
              <Icon name="spinner" size={20} color="#fff" />
            ) : (
              <Icon name="paper-plane" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const { height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: height * 0.02,
    backgroundColor: 'white',
    borderBottomWidth: width * 0.002,
    borderBottomColor: '#e0e0e0',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  mensajesList: {
    flex: 1,
  },
  mensajesContent: {
    padding: 15,
  },
  mensajeContainer: {
    marginBottom: 15,
    flexDirection: 'row',
  },
  mensajeUsuario: {
    justifyContent: 'flex-end',
  },
  mensajeBot: {
    justifyContent: 'flex-start',
  },
  mensajeBurbuja: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  burbujaUsuario: {
    backgroundColor: '#42d68c',
    borderBottomRightRadius: 4,
  },
  burbujaBot: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
  },
  mensajeTexto: {
    fontSize: 16,
    lineHeight: 20,
  },
  mensajeTextoUsuario: {
    color: 'white',
  },
  mensajeTextoBot: {
    color: '#333',
  },
  medicamentosContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#42d68c',
  },
  medicamentosTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  medicamentoItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  medicamentoNombre: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#42d68c',
  },
  medicamentoInfo: {
    fontSize: 12,
    color: '#666',
  },
  medicamentoEstado: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
    marginRight: 10,
  },
  enviarButton: {
    backgroundColor: '#42d68c',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enviarButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default Chatbot;