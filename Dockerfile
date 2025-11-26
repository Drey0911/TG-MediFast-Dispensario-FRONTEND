# Base image para desarrollo de React Native (Metro bundler)
FROM node:20-alpine

# Directorio de trabajo
WORKDIR /app

# Variables de entorno útiles para Metro
ENV NODE_ENV=development \
    CI=true \
    REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

# Copia los manifiestos y instala dependencias (más rápido con cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copia el resto del código
COPY . .

# Puerto de Metro
EXPOSE 8081

# Comando por defecto: iniciar Metro bundler
CMD ["npx", "react-native", "start", "--host", "0.0.0.0", "--port", "8081"]