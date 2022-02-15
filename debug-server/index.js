const http = require('http'),
  httpProxy = require('http-proxy');

//
// Create a proxy server with custom application logic
//
const proxy = httpProxy.createProxyServer({});

//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//
const server = http.createServer(function (request, res) {
  const {headers, method, url} = request;
  console.log(method, url, headers);
  let body = [];
  request.on('error', (err) => {
    console.error(err);
  }).on('data', (chunk) => {
    console.log('data');
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    console.log('body', body);
    // At this point, we have the headers, method, url and body, and can now
    // do whatever we need to in order to respond to this request.
  });

  proxy.web(request, res, {
    changeOrigin: true,
    // target: 'https://bee-0.gateway.ethswarm.org'
    target: 'http://pi.local:1633'
  });
});

console.log("listening on port 1633")
server.listen(1633);
