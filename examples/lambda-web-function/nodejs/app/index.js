const http = require("node:http");

const endpoint = new URL(process.env.AWS_LAMBDA_HTTP_ENDPOINT);
http.createServer((_req, res) => res.end("hello from Lambda")).listen(
    Number(endpoint.port),
    endpoint.hostname,
);
