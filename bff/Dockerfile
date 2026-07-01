# bff 컨테이너 이미지 (모노레포: shared + bff 빌드)
# 빌드 컨텍스트는 모노레포 루트(webapp/)여야 한다:
#   docker build -f bff/Dockerfile -t <user>/candle-bff:dev .
FROM node:20-alpine AS build
WORKDIR /app
# 워크스페이스 그래프 해석용 package.json들 + lockfile 먼저(레이어 캐시)
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY bff/package.json bff/
COPY webapp/package.json webapp/
COPY admin/package.json admin/
RUN npm ci
# 소스 복사 후 shared → bff 빌드
COPY shared shared
COPY bff bff
RUN npm run build -w @candle/shared && npm run build -w @candle/bff

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY bff/package.json bff/
COPY webapp/package.json webapp/
COPY admin/package.json admin/
RUN npm ci --omit=dev --ignore-scripts --workspace @candle/shared --workspace @candle/bff

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/shared/package.json ./shared/
COPY --from=build /app/bff/dist ./bff/dist
COPY --from=build /app/bff/package.json ./bff/
EXPOSE 8080
# 헬스/포트는 PORT env로. 운영(k8s)에서도 PORT 주입 필요(서비스 차트가 SERVER_PORT만 주면 bff엔 PORT 별도 필요)
CMD ["node", "bff/dist/server.js"]
