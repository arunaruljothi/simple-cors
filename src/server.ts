// import http = require('http')
// import httpProxy = require('http-proxy')


import { createServer, IncomingMessage, ServerResponse, Server } from "http"
import { createProxyServer } from 'http-proxy'
import * as fs from 'fs'

// create interface to keep type checks happy
interface CONFIG {
  proxy_as_https: boolean
  allowed_origin_root: string,
  enable_logging: boolean,
  disable_reproxy: boolean,
  enable_redirect: boolean,
  proxy_port: string,
  per_domain: {[key: string]: string},
  no_proxy: []
}

// read configuration
let configFile = ''

try {
  const configFile = fs.readFileSync('./webConfig.json', 'utf-8')
} catch (err) {
  console.error(`We encountered an error while reading the config: ${err}`, 'error')
}
const webConfig: CONFIG = JSON.parse(configFile)


// load configuration
const enableHttpsProxy = webConfig.proxy_as_https
const allowedOriginRoot = webConfig.allowed_origin_root
const enableLogging = webConfig.enable_logging
let disableReproxy = webConfig.disable_reproxy
const enableRedirect = webConfig.enable_redirect
const proxyPort = webConfig.proxy_port || (enableHttpsProxy ? "443" : "80")
const perDomainRaw = webConfig.per_domain

const protocol = enableHttpsProxy ? "https" : "http"
const port = process.env.PORT || "80"
const name = `simple-proxy-${port}`
const requiresOrigin = allowedOriginRoot != "*"
const perDomain: {[key: string]: Array<string>} = {};


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

// parse per domain
const parseDomainSingle = function(domainTargetPort: string){
  try {
    const [domain, targetPort] = domainTargetPort.split('@')
    let newProtocol, target, port
    if (targetPort.split(':').length > 2){
      [newProtocol, target, port] = targetPort.split(':')
    }else {
      newProtocol = protocol;
      [target, port] = targetPort.split(':')
    }
    perDomain[domain] = [newProtocol, target, port || proxyPort]
  } catch (err) {
    log(String(err), 'error')
  }
}

if (perDomainRaw != undefined){
  for(let domain in perDomainRaw) parseDomainSingle(perDomainRaw[domain])
}

// no-proxy function
const toggleReproxy = (domain: string) => {
  Object.keys(perDomainRaw).includes(domain)
    ? disableReproxy = true
    : disableReproxy = false
}

// proxy server
const proxy = createProxyServer({})
const handler = function (req: IncomingMessage, res: ServerResponse) {
  // set host
  const host = req.headers.host
  const fullTarget = `${protocol}://${host}${req.url}`
  const targetHostname = (new URL(fullTarget)).hostname

  // set target
  let target = `${protocol}://${targetHostname}:${proxyPort}`
  Object.keys(perDomain).forEach((s) => {
    if (targetHostname.includes(s)){
      const [t, h, p] = perDomain[s]
      target = `${t}://${targetHostname.replace(s, h)}:${p}`
    }
  })

  // set origin
  const origin: string | undefined = req.headers.origin
  const originHostname = req.headers.origin ? (new URL(req.headers.origin)).hostname : ""

  // if we previously proxied this result end it now
  if (disableReproxy && ("x-proxy-by" in req.headers)){
    log (`RE_PROXY:: ${origin} -> ${target}`)
    res.writeHead(400, "ATTEMPT AT RE PROXY")
    res.end()
    return
  }

  // redirect on same origin or origin required and was not provided
  if ( enableRedirect && (originHostname == targetHostname)){
    log(`REDIRECT:: ${origin} -> ${target}`)
    res.writeHead(302, {
      'Location': `${target}${req.url}`
    })
    res.end()
    return
  }

  // cors
  if ( allowedOriginRoot == "*" || originHostname.includes(allowedOriginRoot)){
    // cors allowed
    const allowedHeaders = req.headers["access-control-request-headers"] || ""
    const allowedMethods = req.headers["access-control-request-method"] || ["GET", "POST", "PUT", "OPTIONS"].join(', ')
    res.setHeader('access-control-allow-methods', allowedMethods)
    if ('access-control-request-headers' in req.headers){
      res.setHeader('access-control-allow-headers',allowedHeaders )
    }
    res.setHeader('Access-Control-Allow-Origin', origin || "*")
    res.setHeader('Access-Control-Allow-Credentials', "true")
    log(`CORS:: ${origin} -> ${target}`)
  }else{
    log(`NO_CORS:: ${origin} -> ${target}`)
  }

  // mark the request has having been proxied
  res.setHeader("x-proxy-by", name)
  proxy.web(req, res, {
    target: target
  })
}
// register function
const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
  try {
    handler(req, res)
  } catch (error) {
    console.error(error)
  }
})

// health check server
const healthPort = (parseInt(port) + 1).toString()
const healthServer: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(200)
  res.write("OK")
  res.end()
})

// launch servers
if (port == proxyPort){
  throw "CANNOT PROXY ONTO LISTENING PORT"
}
server.listen(port)
healthServer.listen(healthPort)
log(`server started on ${port} health check on ${healthPort}`)
log(`proxied request will be made through protocol:${protocol} & port:${proxyPort}`)
log(`allowed origins:${allowedOriginRoot}, requests can ${requiresOrigin ? 'NOT ' : ''}omit origin`)
log('redirect domains:')
console.log(perDomain)
