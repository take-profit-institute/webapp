# admin 정적 번들 이미지 (Next output=export → nginx).
# 빌드 컨텍스트는 모노레포 루트(webapp/)여야 한다:
#   docker build -f admin/Dockerfile -t <user>/candle-admin:dev \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.lite.candle.io.kr .
#
# ⚠️ NEXT_PUBLIC_*는 정적 export 시점에 번들로 박힌다 → 환경마다 이미지를 따로 빌드해야 한다.
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

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_AUTH_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_AUTH_BASE_URL=$NEXT_PUBLIC_AUTH_BASE_URL

# admin은 next.config에 output:'export'가 고정 → build 하나로 admin/out 생성
RUN npm run build -w @candle/shared && npm run build -w @candle/admin

FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx-static.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin/out /usr/share/nginx/html
EXPOSE 80
