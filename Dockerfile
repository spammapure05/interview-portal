FROM node:20-alpine AS builder

WORKDIR /app

COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/frontend
# durante il build vogliamo anche i devDependencies (vite, ecc.)
ENV NODE_ENV=development
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
