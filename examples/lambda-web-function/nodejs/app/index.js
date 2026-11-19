const http = require("node:http");

// Lambda supplies a host:port address, not a URL.
const [host, port] = process.env.AWS_LAMBDA_HTTP_ENDPOINT.split(":");
http.createServer((_req, res) => res.end(`hello from Lambda: ${process.env.RELEASE}`)).listen(
    Number(port),
    host,
);
