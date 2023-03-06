# simple-cors

This small script was originally designed to be used with AWS as a reverse proxy to support CORS. It is meant to have the ALB target a small ecs task running it. When targeting this task the origin specified by the ALB is the target that is proxied.

Ex.

Request to https://subdomain.app.com -> alb listener on 443 -> alb rule to proxy -> proxy requests from http://subdomain.app.com:442 -> alb listener on 442 -> ecs app target


ENV OPTIONS:

* PROXY_AS_HTTPS -> set to "1" to enable https in the proxy target
* ALLOWED_ORIGIN_ROOT -> set to the root of the origin that is allowed, ex google.com to allow anything.google.com

