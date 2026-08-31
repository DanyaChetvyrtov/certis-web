# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.28-alpine AS runtime

RUN rm -f /etc/nginx/conf.d/default.conf \
    && mkdir -p \
        /tmp/client_temp \
        /tmp/fastcgi_temp \
        /tmp/proxy_temp \
        /tmp/scgi_temp \
        /tmp/uwsgi_temp \
    && chown -R nginx:nginx \
        /tmp/client_temp \
        /tmp/fastcgi_temp \
        /tmp/proxy_temp \
        /tmp/scgi_temp \
        /tmp/uwsgi_temp

COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
