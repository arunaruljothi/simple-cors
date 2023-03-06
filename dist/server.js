"use strict";
// import http = require('http')
// import httpProxy = require('http-proxy')
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const http_proxy_1 = require("http-proxy");
// load env vars
const enableHttpsProxy = ((process.env.PROXY_AS_HTTPS || "0") === "1");
const prefix = enableHttpsProxy ? "https" : "http";
const allowedOriginRoot = process.env.ALLOWED_ORIGIN_ROOT || "*";
// proxy server
const proxy = (0, http_proxy_1.createProxyServer)({});
const server = (0, http_1.createServer)((req, res) => {
    const target = `${prefix}://${req.headers.host}${req.url}`;
    const origin = req.headers.origin || "";
    if (allowedOriginRoot == "*" || origin.includes(allowedOriginRoot)) {
        // cors allowed
        const allowedHeaders = req.headers["access-control-request-headers"] || "";
        const allowedMethods = req.headers["access-control-request-method"] || ["GET", "POST", "PUT", "OPTIONS"].join(', ');
        res.setHeader('access-control-allow-methods', allowedMethods);
        if ('access-control-request-headers' in req.headers) {
            res.setHeader('access-control-allow-headers', allowedHeaders);
        }
        res.setHeader('Access-Control-Allow-Origin', origin || "*");
        res.setHeader('Access-Control-Allow-Credentials', "true");
    }
    proxy.web(req, res, {
        target: target
    });
});
// launch server
server.listen(8080);