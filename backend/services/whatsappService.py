import requests
import json
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

class WhatsAppService:
    def __init__(self):
        # Leer desde variables de entorno
        self.phone_id = os.getenv('WHATSAPP_PHONE_ID')
        self.token = os.getenv('WHATSAPP_ACCESS_TOKEN')
        
        # Validar que las variables estén configuradas
        if not self.phone_id:
            raise ValueError("WHATSAPP_PHONE_ID no está configurado en las variables de entorno")
        if not self.token:
            raise ValueError("WHATSAPP_ACCESS_TOKEN no está configurado en las variables de entorno")
            
        self.base_url = f"https://graph.facebook.com/v22.0/{self.phone_id}/messages"
        
    def send_medifast_notification(self, to_number, nombre_paciente, nombre_medicamento, sede, stock_actual):
        """Envía notificación Medifast como mensaje de texto normal"""
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        # Crear el mensaje de texto con la información
        mensaje = f"""🚨 Notificación Medifast 

Hola, se ha realizado un cambio en el stock de un medicamento que tienes en favoritos.:

📋 Paciente: {nombre_paciente}
💊 Medicamento: {nombre_medicamento}
🏥 Sede: {sede}
📦 Stock actual: {stock_actual}

Por favor verificar el inventario en la APP en el apartado de MEDICAMENTOS."""

        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {
                "body": mensaje
            }
        }
        
        try:
            print(f"=== DEBUG WHATSAPP ===")
            print(f"Enviando a: {to_number}")
            print(f"Phone ID: {self.phone_id}")
            print(f"Mensaje: {mensaje}")
            print(f"Payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(self.base_url, headers=headers, json=payload)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            response.raise_for_status()
            
            response_data = response.json()
            print(f"WhatsApp API response: {json.dumps(response_data, indent=2)}")
            
            # Verificar si el mensaje fue aceptado por WhatsApp
            if 'messages' in response_data:
                message_id = response_data['messages'][0]['id']
                print(f"Mensaje enviado exitosamente. ID: {message_id}")
            else:
                print("Respuesta inesperada de WhatsApp API")
            
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"Error enviando notificación Medifast:")
            print(f"   Error: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"   Status Code: {e.response.status_code}")
                print(f"   Response: {e.response.text}")
            return False

    def send_recoleccion_reminder(self, to_number, nombre_paciente, no_recoleccion, fecha_recoleccion, hora_recoleccion, sede, medicamentos):
        """Envía recordatorio de recolección 3 horas antes"""
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        # Formatear la lista de medicamentos
        if isinstance(medicamentos, list):
            lista_medicamentos = "\n".join([f"   • {med}" for med in medicamentos])
        else:
            lista_medicamentos = f"   • {medicamentos}"
        
        # Crear el mensaje de recordatorio
        mensaje = f"""🔔 Recordatorio de Recolección Medifast

Hola {nombre_paciente},

Te recordamos que tienes una recolección agendada para hoy:

📅 Fecha: {fecha_recoleccion}
⏰ Hora: {hora_recoleccion}
🏥 Sede: {sede}
📋 N° de Recolección: {no_recoleccion}

💊 Medicamentos:
{lista_medicamentos}

📍 Por favor asistir puntualmente. 
❌ Si no puedes asistir, cancela tu recolección en la app.

¡Gracias por confiar en Medifast!"""

        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {
                "body": mensaje
            }
        }
        
        try:
            print(f"=== DEBUG WHATSAPP RECORDATORIO ===")
            print(f"Enviando recordatorio a: {to_number}")
            print(f"Phone ID: {self.phone_id}")
            print(f"Mensaje: {mensaje}")
            
            response = requests.post(self.base_url, headers=headers, json=payload)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            response.raise_for_status()
            
            response_data = response.json()
            print(f"WhatsApp API response: {json.dumps(response_data, indent=2)}")
            
            # Verificar si el mensaje fue aceptado por WhatsApp
            if 'messages' in response_data:
                message_id = response_data['messages'][0]['id']
                print(f"Recordatorio enviado exitosamente. ID: {message_id}")
            else:
                print("Respuesta inesperada de WhatsApp API")
            
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"Error enviando recordatorio de recolección:")
            print(f"   Error: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"   Status Code: {e.response.status_code}")
                print(f"   Response: {e.response.text}")
            return False

    def send_password_recovery(self, to_number, nombre_usuario, nueva_password):
        """Envía mensaje con nueva contraseña de recuperación"""
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        # Crear el mensaje de recuperación de contraseña
        mensaje = f"""🔐 Recuperación de Contraseña - Medifast

Hola {nombre_usuario},

Tu nueva contraseña de acceso al sistema es:

🔑 **{nueva_password}**

⚠️ IMPORTANTE:
• Cambia esta contraseña lo más pronto posible por tu seguridad
• Ve a Mi Perfil → Cambiar contraseña 
• No compartas esta información con nadie

📱 Inicia sesión en la app con tu DNI y esta nueva contraseña.

¡Gracias por usar Medifast!"""

        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {
                "body": mensaje
            }
        }
        
        try:
            print(f"=== DEBUG WHATSAPP RECUPERACIÓN ===")
            print(f"Enviando recuperación a: {to_number}")
            print(f"Phone ID: {self.phone_id}")
            print(f"Usuario: {nombre_usuario}")
            print(f"Nueva contraseña: {nueva_password}")
            
            response = requests.post(self.base_url, headers=headers, json=payload)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            response.raise_for_status()
            
            response_data = response.json()
            print(f"WhatsApp API response: {json.dumps(response_data, indent=2)}")
            
            # Verificar si el mensaje fue aceptado por WhatsApp
            if 'messages' in response_data:
                message_id = response_data['messages'][0]['id']
                print(f"Mensaje de recuperación enviado exitosamente. ID: {message_id}")
            else:
                print("Respuesta inesperada de WhatsApp API")
            
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"Error enviando mensaje de recuperación:")
            print(f"   Error: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"   Status Code: {e.response.status_code}")
                print(f"   Response: {e.response.text}")
            return False

# Instancia global del servicio
whatsapp_service = WhatsAppService()