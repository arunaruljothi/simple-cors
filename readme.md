# simple-cors

## why

This small script was originally designed to be used with AWS ALBs as a reverse proxy to support CORS. It is meant to have the ALB target a small ecs task running it. When targeting this task the origin specified by the ALB is the target that is proxied.

features:
* supports preflight requests
* redirects same origins


Ex.

```
client request to https://subdomain.app.com
-> alb listener on 443 (ssl termination)
-> alb rule to target proxy on ecs
-> proxy sends request to http://subdomain.app.com:442
-> alb listener on 442
-> alb rule to target app on ecs
-> proxy returns response with matching CORS headers
-> client
```


## env options

* PROXY_AS_HTTPS
  * set to "1" to enable https in the proxy target
* ALLOWED_ORIGIN_ROOT
  * set to the root of the origin that is allowed
  * ex. google.com to allow anything.google.com
* PORT
  * port to server the proxy server, a health check is served on the port + 1,
  * defaults to 80 (health check on 81)
* ENABLE_LOGGING
  * set to 0 to disable logging
  * enabled by default
* PROXIED_PORT
  * port to proxy requests to
  * by default it will be set to the matching port for the protocol
* DISABLE_REPROXY
  * disable reproxy attempts
* ENABLE_REDIRECT
  * enable redirecting on same origin or no origin
* PER_DOMAIN
  * configure per domain settings as
    * old_domain@protocol:new_domain:port
    * where protocol is `http or https`
    * protocol and/or port may be omitted to use defaults

## health check
A health check is served on `http://server:PORT+1/`

## commands

* npm build -> to build into dist folder
* npm run debug -> to run server for testing
* npm run serve -> to run production
