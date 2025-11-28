FROM node:20-alpine AS builder

WORKDIR /app

COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/frontend
RUN npm install && npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/backend ./backend
RUN mkdir -p ./backend/public
COPY --from=builder /app/frontend/dist ./backend/public

WORKDIR /app/backend
RUN npm install --omit=dev

ENV PORT=4000
ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "server.js"]
