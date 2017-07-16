'use strict';

var restify = require('restify'),
    restifyValidator  =  require('restify-validator'),
    fs = require('fs'),
    proof = require(`./controller/proof.js`),
    key = require(`./controller/key.js`);

var development = process.env.NODE_ENV !== 'production';
var port = process.env.PORT || 443;

var opts = {};

if (development) {
  opts.certificate = fs.readFileSync('server.crt');
  opts.key = fs.readFileSync('server.key');
}

var server = restify.createServer(opts);

server.use(restify.CORS());
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restifyValidator);

server.post('/api/proof', proof.post);
server.put('/api/proof', proof.put);
server.get('/api/proof', proof.get);
server.patch('/api/proof', proof.patch);
server.post('/api/key', key.post);
server.get('/api/key', key.get);

server.listen(port, err => {
  if (err) 
    return console.error(`error running server: ${err.message}`);

  return console.log(`server is listening at ${server.url}`);
});
