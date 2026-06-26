# webapp 정적 빌드 → nginx 서빙
# 빌드 컨텍스트는 모노레포 루트:
#   docker build -f webapp/Dockerfile -t yyubin/candle-webapp:dev .
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY bff/package.json bff/
COPY webapp/package.json webapp/
COPY admin/package.json admin/
RUN npm ci
COPY shared shared
COPY webapp webapp
RUN npm run build -w @candle/shared && npm run build -w @candle/webapp

FROM nginx:alpine AS runtime
COPY --from=build /app/webapp/out /usr/share/nginx/html
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  location / {\n\
    try_files $uri $uri.html $uri/index.html =404;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
