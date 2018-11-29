FROM nginx:1.15.5-alpine

COPY nginx.conf /etc/nginx/nginx.conf
ARG API_URL
ARG FRONTEND_URL
RUN echo ${API_URL} > test.txt
# the nginx.conf file has two URLs that need to be replaced with build time args
RUN sed -i "s,{{api_url}},"$API_URL",g" /etc/nginx/nginx.conf
RUN sed -i "s,{{frontend_url}},"$FRONTEND_URL",g" /etc/nginx/nginx.conf

#RUN apk add openssl
#RUN openssl req -x509 -nodes -days 730 \
# -newkey rsa:2048 \
#  -keyout /etc/ssl/private/nginx-selfsigned.key \
#  -out /etc/ssl/certs/nginx-selfsigned.crt \
#  -subj "/C=US/ST=./L=./O=./CN=."
COPY nginx-selfsigned.key /etc/ssl/private/nginx-selfsigned.key
COPY nginx-selfsigned.crt /etc/ssl/certs/nginx-selfsigned.crt