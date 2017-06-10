var restify = require('restify'),
    restifyValidator  =  require('restify-validator'),
    fs = require('fs'),
    proof = require(`./controller/proof.js`);

var server = restify.createServer({
    name: 'iBera-test'
});

server.use(restify.CORS());
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restifyValidator);

server.post('/api/proof', proof.post);
server.put('/api/proof', proof.put);
server.get('/api/proof', proof.get);
server.patch('/api/proof', proof.patch)

var port = process.env.PORT || 80;
server.listen(port, function () {
    console.log('%s listening at %s', server.name, server.url);
});