// import http = require('http')
// import httpProxy = require('http-proxy')


import { createServer, IncomingMessage, ServerResponse, Server } from "http"
import { createProxyServer } from 'http-proxy'

// load env vars
const enableHttpsProxy = ((process.env.PROXY_AS_HTTPS || "0") === "1")
const prefix = enableHttpsProxy ? "https" : "http"
const allowedOriginRoot = process.env.ALLOWED_ORIGIN_ROOT || "*"
const port = process.env.PORT || "80"

// proxy server
const proxy = createProxyServer({})
const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const target = `${prefix}://${req.headers.host}${req.url}`
  const origin = req.headers.origin || ""
  if ( allowedOriginRoot == "*" || origin.includes(allowedOriginRoot)){
    // cors allowed
    const allowedHeaders = req.headers["access-control-request-headers"] || ""
    const allowedMethods = req.headers["access-control-request-method"] || ["GET", "POST", "PUT", "OPTIONS"].join(', ')
    res.setHeader('access-control-allow-methods', allowedMethods)
    if ('access-control-request-headers' in req.headers){
      res.setHeader('access-control-allow-headers',allowedHeaders )
    }
    res.setHeader('Access-Control-Allow-Origin', origin || "*")
    res.setHeader('Access-Control-Allow-Credentials', "true")
  }
  proxy.web(req, res, {
    target: target
  })
})

// health check server
const healthPort = (parseInt(port) + 1).toString()
const healthServer: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(200)
  res.write("OK")
  res.end()
})

// launch servers
server.listen(port)
healthServer.listen(healthPort)
