# Usa uma imagem leve do Node
FROM node:18-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependência e instala
COPY package*.json ./
RUN npm install

# Copia o resto do código
COPY . .

# Compila o TypeScript para JavaScript
RUN npm run build

# Expõe a porta que a API vai rodar
EXPOSE 3000

# Comando para iniciar a aplicação compilada
CMD ["node", "dist/server.ts"]