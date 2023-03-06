// import http = require('http')
// import httpProxy = require('http-proxy')


import { createServer, IncomingMessage, ServerResponse, Server } from "http"
import { createProxyServer } from 'http-proxy'

// load env vars
const enableHttpsProxy = ((process.env.PROXY_AS_HTTPS || "0") === "1")
const allowedOriginRoot = process.env.ALLOWED_ORIGIN_ROOT || "*"
const enableLogging = ((process.env.ENABLE_LOGGING || "1") === "1")
const proxiedPort = process.env.PROXY_PORT || (enableHttpsProxy ? "443" : "80")

const protocol = enableHttpsProxy ? "https" : "http"
const port = process.env.PORT || "80"
const name = `simple-proxy-${port}`

// logger
const log = function(mes: string, level: "info" | "error" = "info"){
  if (enableLogging){
    if (level == "error"){
      console.error(mes)
    }{
      console.info(mes)
    }
  }
}

// proxy server
const proxy = createProxyServer({})
const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
  // set target
  let target = `${protocol}://${req.headers.host}${req.url}`
  const target_hostname = (new URL(target)).hostname
  target = `${protocol}://${target_hostname}:${proxiedPort}${req.url}`

  // set origin
  const origin_url: URL | undefined = req.headers.origin ? new URL(req.headers.origin) : undefined
  const origin_hostname = origin_url ? origin_url.hostname : ""

  // if we previously proxied this result end it now
  if ("x-proxy-by" in req.headers){
    log (`RE_PROXY:: ${origin_url?.href} -> ${target}`)
    res.writeHead(400, "ATTEMPT AT RE PROXY")
    res.end()
    return
  }

  // redirect on same origin
  if (origin_hostname == target_hostname){
    log(`REDIRECT:: ${origin_url?.href} -> ${target}`)
    res.writeHead(302, {
      'Location': target
    })
    res.end()
    return
  }

  // cors
  if ( allowedOriginRoot == "*" || origin_hostname.includes(allowedOriginRoot)){
    // cors allowed
    const allowedHeaders = req.headers["access-control-request-headers"] || ""
    const allowedMethods = req.headers["access-control-request-method"] || ["GET", "POST", "PUT", "OPTIONS"].join(', ')
    res.setHeader('access-control-allow-methods', allowedMethods)
    if ('access-control-request-headers' in req.headers){
      res.setHeader('access-control-allow-headers',allowedHeaders )
    }
    res.setHeader('Access-Control-Allow-Origin', origin_url?.href || "*")
    res.setHeader('Access-Control-Allow-Credentials', "true")
    log(`CORS:: ${origin_url?.href} -> ${target}`)
  }else{
    log(`NO_CORS:: ${origin_url?.href} -> ${target}`)
  }

  // mark the request has having been proxied
  res.setHeader("x-proxy-by", name)
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
if (port == proxiedPort){
  throw "CANNOT PROXY ONTO LISTENING PORT"
}
server.listen(port)
healthServer.listen(healthPort)
log(`server started on ${port} health check on ${healthPort}`)
log(`proxied request will be made through protocol:${protocol} & port:${proxiedPort}`)
