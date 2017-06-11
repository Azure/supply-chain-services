'use strict';

var restify = require('restify'),
    restifyValidator  =  require('restify-validator'),
    fs = require('fs'),
    proof = require(`./controller/proof.js`),
    key = require(`./controller/key.js`);


var development = process.env.NODE_ENV !== 'production';
var port = process.env.port || process.env.PORT || 443;
var server = null;

if (development) {
    server = restify.createServer({
        certificate: fs.readFileSync('server.crt'),
        key: fs.readFileSync('server.key'),
        port: port, 
        name: 'iBera-services'
    });
}
else {
    server = restify.createServer({
        name: 'iBera-services'
    });   
}

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

server.listen(port, function () {
    console.log('%s listening at %s', server.name, server.url);
});