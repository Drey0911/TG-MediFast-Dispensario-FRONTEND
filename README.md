# MediFast

<p align="center">
  <img src="img/logo-green.png" alt="MediFast Logo" width="300">
</p>

## Descripción

MediFast es una aplicación móvil desarrollada en React Native que facilita la gestión de medicamentos y recolecciones en dispensarios médicos. La aplicación permite a los usuarios consultar medicamentos disponibles, solicitar recolecciones, gestionar favoritos y acceder a su historial de solicitudes.

## Arquitectura

MediFast está desarrollado siguiendo el patrón de arquitectura MVP (Modelo-Vista-Presentador):

### Modelo (Models)
Contiene las clases de datos y la lógica de negocio:
- `User.ts`: Modelo para la información del usuario
- `Medicamento.ts`: Modelo para los medicamentos
- `Recoleccion.ts`: Modelo para las solicitudes de recolección
- `Favorito.ts`: Modelo para los medicamentos favoritos

### Vista (Views)
Contiene las interfaces de usuario divididas en:

#### Componentes (Components)
- `Alert.tsx`: Componente para mostrar alertas
- `BrandHeader.tsx`: Encabezado con la marca de la aplicación
- `ButtonModules.tsx`: Botones para los módulos principales
- `CustomButton.tsx`: Botón personalizado reutilizable
- `CustomInput.tsx`: Campo de entrada personalizado
- `Loading.tsx`: Componente de carga
- `LoginForm.tsx`: Formulario de inicio de sesión
- `Splash.tsx`: Pantalla de carga inicial

#### Pantallas (Screens)
- `LoginScreen.tsx`: Pantalla de inicio de sesión
- `RegisterScreen.tsx`: Pantalla de registro
- `HomeScreen.tsx`: Pantalla principal
- `MedicamentosScreen.tsx`: Listado de medicamentos
- `DetailScreen.tsx`: Detalles de un medicamento
- `RecoleccionesScreen.tsx`: Gestión de recolecciones
- `FavoritosScreen.tsx`: Medicamentos favoritos
- `HistorialScreen.tsx`: Historial de solicitudes
- `UserScreen.tsx`: Perfil de usuario
- `PackageScreen.tsx`: Información de paquetes
- `PasswordRecoveryScreen.tsx`: Recuperación de contraseña

### Presentador (Presenters)
Contiene la lógica de presentación que conecta los modelos con las vistas:
- `AuthPresenter.ts`: Gestión de autenticación
- `UserPresenter.ts`: Gestión de datos de usuario
- `MedicamentoPresenter.ts`: Gestión de medicamentos
- `RecoleccionPresenter.ts`: Gestión de recolecciones
- `FavoritoPresenter.ts`: Gestión de favoritos
Como tambien, contienen el consumo de API por medio de la configuracion del servicio con AXIOS usando await api.post
y los demas metodos HTTP como GET, PUT, DELETE, etc.

## Conexión con la API

La aplicación se conecta a un backend a través de una API REST utilizando Axios:

- La configuración base de la API se encuentra en `config/apiBase.ts`
- Los servicios de API están en `services/api.ts`
- Se utilizan interceptores para manejar la autenticación y los errores
- La aplicación también implementa WebSockets para comunicación en tiempo real

## Librerías Principales

- **React Native**: Framework principal para el desarrollo de la aplicación móvil
- **React Navigation**: Navegación entre pantallas
- **Axios**: Cliente HTTP para realizar peticiones a la API
- **Socket.io-client**: Cliente para comunicación en tiempo real
- **AsyncStorage**: Almacenamiento local de datos
- **React Native Vector Icons**: Iconos para la interfaz
- **React Native Linear Gradient**: Efectos de gradiente
- **React Native DateTimePicker**: Selector de fecha y hora
- **JWT Decode**: Decodificación de tokens JWT

## Instalación y Configuración

### Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- React Native CLI
- Android Studio (para desarrollo en Android)
- Xcode (para desarrollo en iOS, solo macOS)
- JDK 11 o superior

### Pasos de Instalación

1. Clonar el repositorio:
   ```
   git clone <url-del-repositorio>
   cd MediFast
   ```

2. Instalar dependencias:
   ```
   npm install
   # o
   yarn install
   ```

3. Configurar la URL de la API:
   - Editar el archivo `config/apiBase.ts` con la URL correcta del backend

### Ejecución en Modo Desarrollo

1. Iniciar el servidor de Metro:
   ```
   npx react-native start
   ```

2. En otra terminal, ejecutar la aplicación:

   Para Android:
   ```
   npx react-native run-android
   ```

## Funcionalidades Principales

- **Autenticación**: Registro, inicio de sesión y recuperación de contraseña
- **Consulta de Medicamentos**: Listado y búsqueda de medicamentos disponibles
- **Detalles de Medicamentos**: Información detallada de cada medicamento
- **Favoritos**: Guardar medicamentos como favoritos para acceso rápido
- **Recolecciones**: Solicitar y gestionar recolecciones de medicamentos
- **Historial**: Consultar el historial de solicitudes realizadas
- **Perfil de Usuario**: Gestión de información personal

## Estructura de Navegación

La aplicación utiliza React Navigation Stack Navigator para la navegación entre pantallas:

- Splash (pantalla inicial)
- Login (inicio de sesión)
- Register (registro)
- PasswordRecovery (recuperación de contraseña)
- Home (pantalla principal)
- Medicamentos (listado de medicamentos)
- Detail (detalles de medicamento)
- Recolecciones (gestión de recolecciones)
- Favoritos (medicamentos favoritos)
- Historial (historial de solicitudes)
- User (perfil de usuario)
- Package (información de paquetes)

## Generación de APK para Android

Para construir el archivo APK de producción de MediFast, sigue estos pasos:

### Preparación de la versión

1. **Actualiza la versión en `android/app/build.gradle`:**
   ```
   android {
       defaultConfig {
           versionCode 1  // Incrementa este número en cada release
           versionName "1.0"  // Cambia el número de versión
       }
   }
   ```

2. **Genera el bundle de la aplicación:**

En linux 

   ```
   cd android
   ./gradlew bundleRelease
   ```

En Windows

   ```
   cd android
   gradlew bundleRelease
   ```

3. **Genera el APK de release:**

En linux

   ```
   cd android
   ./gradlew assembleRelease 
   ```

En Windows 

   ```
   cd android
   gradlew assembleRelease 
   ```

4. **El APK generado se encuentra en:**
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

### Requisitos previos para generar APK

- Tener configurado correctamente el `keystore` para firmar la aplicación
- Configurar las variables de entorno en `~/.gradle/gradle.properties`:
  ```
  MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
  MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
  MYAPP_UPLOAD_STORE_PASSWORD=*****
  MYAPP_UPLOAD_KEY_PASSWORD=*****
  ```

### Instalación del APK

Una vez generado el APK, puedes instalarlo directamente en un dispositivo Android

## Licencia

Todos los derechos reservados. © 2025 Andrey Stteven Mantilla Leon y Daniel Esteban Pinzon Cardenas.

Este software es propiedad de sus creadores y no puede ser reproducido, distribuido o utilizado sin autorización expresa.