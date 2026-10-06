# Build context is the repository root: docker build -f server/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/server/dist ./dist
# Uploaded and seeded product images live here (see upload-images-directory.ts)
COPY client/public/images /app/client/public/images
EXPOSE 3001
USER node
CMD ["node", "dist/index.js"]
