FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx prisma generate

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "src/index.js"]
