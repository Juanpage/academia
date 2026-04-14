FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache dumb-init

# Copiar package files e instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Crear directorio de logs
RUN mkdir -p logs

# Copiar código fuente
COPY . .

# Usuario no-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
