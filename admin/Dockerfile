# admin Next.js 서버 (standalone 빌드)
# 빌드 컨텍스트는 모노레포 루트:
#   docker build -f admin/Dockerfile -t yyubin/candle-admin:dev .
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY bff/package.json bff/
COPY webapp/package.json webapp/
COPY admin/package.json admin/
RUN npm ci
COPY shared shared
COPY admin admin
RUN npm run build -w @candle/shared && npm run build -w @candle/admin

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
COPY --from=build /app/admin/.next/standalone ./
COPY --from=build /app/admin/.next/static ./admin/.next/static
COPY --from=build /app/admin/public ./admin/public
EXPOSE 3001
CMD ["node", "admin/server.js"]
