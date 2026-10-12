FROM node:22-alpine
WORKDIR /app

# frontend: instala (com devDependencies) e compila
COPY frontend/package.json frontend/
RUN npm install --include=dev --prefix frontend
COPY frontend frontend
RUN npm run build --prefix frontend

# backend: só dependências de produção
COPY backend/package.json backend/
RUN npm install --omit=dev --prefix backend
COPY backend backend

ENV NODE_ENV=production
WORKDIR /app/backend
CMD ["node", "src/server.js"]
