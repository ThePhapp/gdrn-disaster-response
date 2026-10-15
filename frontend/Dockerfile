FROM node:22.14.0-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_MAPTILER_KEY=
ARG VITE_MAP_STYLE_URL=
ARG VITE_MAP_ATTRIBUTION=
ENV VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY \
    VITE_MAP_STYLE_URL=$VITE_MAP_STYLE_URL \
    VITE_MAP_ATTRIBUTION=$VITE_MAP_ATTRIBUTION
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=6 \
    CMD wget --quiet --spider http://127.0.0.1/healthz || exit 1
