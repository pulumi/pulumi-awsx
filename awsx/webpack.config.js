const path = require("path");

module.exports = {
    entry: "./index.ts",
    devtool: "inline-source-map",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".js", ".json"],
        fallback: {
            path: false,
            fs: false,
            constants: false,
            stream: false,
            assert: false,
            os: false,
            timers: false,
            util: false,
            crypto: false,
            vm: false,
            zlib: false,
            http: false,
            http2: false,
            tls: false,
            dns: false,
            net: false,
            child_process: false,
            readline: false,
            v8: false,
            inspector: false,
            module: false,
        },
    },
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "bin"),
    },
};
