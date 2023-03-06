# simple-cors

## usage

This small script was originally designed to be used with AWS as a reverse proxy to support CORS. It is meant to have the ALB target a small ecs task running it. When targeting this task the origin specified by the ALB is the target that is proxied.
This server supports CORS pre-flights.

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


## options

ENV OPTIONS:

* PROXY_AS_HTTPS -> set to "1" to enable https in the proxy target
* ALLOWED_ORIGIN_ROOT -> set to the root of the origin that is allowed, ex google.com to allow anything.google.com


## commands

* npm build -> to build into dist folder
* npm run debug -> to run server for testing
* npm run serve -> to run production
