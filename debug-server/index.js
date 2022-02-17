const http = require('http'),
  httpProxy = require('http-proxy');

const createServer = (port) => {
  return http.createServer(function (request, res) {
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
      target: `http://pi.local:${port}`
    });
  });
}

const proxy = httpProxy.createProxyServer({});
const beeServer = createServer(1633);
const beeDebugServer = createServer(1635);

console.log("listening on port 1633")
beeServer.listen(1633);
console.log("listening on port 1635")
beeDebugServer.listen(1635);
