"use strict";
// import http = require('http')
// import httpProxy = require('http-proxy')
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const http_proxy_1 = require("http-proxy");
// load env vars
const enableHttpsProxy = ((process.env.PROXY_AS_HTTPS || "0") === "1");
const allowedOriginRoot = process.env.ALLOWED_ORIGIN_ROOT || "*";
const enableLogging = ((process.env.ENABLE_LOGGING || "1") === "1");
const proxiedPort = process.env.PROXY_PORT || (enableHttpsProxy ? "443" : "80");
const protocol = enableHttpsProxy ? "https" : "http";
const port = process.env.PORT || "80";
const name = `simple-proxy-${port}`;
const requiresOrigin = allowedOriginRoot != "*";
// logger
const log = function (mes, level = "info") {
    if (enableLogging) {
        if (level == "error") {
            console.error(mes);
        }
        {
            console.info(mes);
        }
    }
};
// proxy server
const proxy = (0, http_proxy_1.createProxyServer)({});
const server = (0, http_1.createServer)((req, res) => {
    // set target
    const fullTarget = `${protocol}://${req.headers.host}${req.url}`;
    const targetHostname = (new URL(fullTarget)).hostname;
    const target = `${protocol}://${targetHostname}:${proxiedPort}`;
    // set origin
    const originUrl = req.headers.origin ? new URL(req.headers.origin) : undefined;
    const originHostname = originUrl ? originUrl.hostname : "";
    // if we previously proxied this result end it now
    if ("x-proxy-by" in req.headers) {
        log(`RE_PROXY:: ${originUrl?.href} -> ${target}`);
        res.writeHead(400, "ATTEMPT AT RE PROXY");
        res.end();
        return;
    }
    // redirect on same origin or origin required and was not provided
    if ((requiresOrigin && (originUrl == undefined)) || (originHostname == targetHostname)) {
        log(`REDIRECT:: ${originUrl?.href} -> ${target}`);
        res.writeHead(302, {
            'Location': fullTarget
        });
        res.end();
        return;
    }
    // cors
    if (allowedOriginRoot == "*" || originHostname.includes(allowedOriginRoot)) {
        // cors allowed
        const allowedHeaders = req.headers["access-control-request-headers"] || "";
        const allowedMethods = req.headers["access-control-request-method"] || ["GET", "POST", "PUT", "OPTIONS"].join(', ');
        res.setHeader('access-control-allow-methods', allowedMethods);
        if ('access-control-request-headers' in req.headers) {
            res.setHeader('access-control-allow-headers', allowedHeaders);
        }
        res.setHeader('Access-Control-Allow-Origin', originUrl?.href || "*");
        res.setHeader('Access-Control-Allow-Credentials', "true");
        log(`CORS:: ${originUrl?.href} -> ${fullTarget}`);
    }
    else {
        log(`NO_CORS:: ${originUrl?.href} -> ${fullTarget}`);
    }
    // mark the request has having been proxied
    res.setHeader("x-proxy-by", name);
    proxy.web(req, res, {
        target: target
    });
});
// health check server
const healthPort = (parseInt(port) + 1).toString();
const healthServer = (0, http_1.createServer)((req, res) => {
    res.writeHead(200);
    res.write("BAD");
    res.end();
});
// launch servers
if (port == proxiedPort) {
    throw "CANNOT PROXY ONTO LISTENING PORT";
}
server.listen(port);
healthServer.listen(healthPort);
log(`server started on ${port} health check on ${healthPort}`);
log(`proxied request will be made through protocol:${protocol} & port:${proxiedPort}`);
