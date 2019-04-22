FROM alpine AS build
COPY content/index.html /

FROM nginx
COPY --from=build /index.html /usr/share/nginx/html
