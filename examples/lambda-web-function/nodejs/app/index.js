const http = require("node:http");

const [host, port] = process.env.AWS_LAMBDA_HTTP_ENDPOINT.split(":");
http.createServer((_req, res) => res.end("hello from Lambda")).listen(Number(port), host);
