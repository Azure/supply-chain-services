'use strict';



var util = require('util');
var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('express-cors');
var expressValidator = require('express-validator');

var api = require('./api');

var server = express();
var port = process.env.PORT || 443;


var development = process.env.NODE_ENV !== 'production';
//var port = process.env.PORT || 443;

var sslOptions = {};

if (development) {
  sslOptions.cert = fs.readFileSync('server.crt');
  sslOptions.key = fs.readFileSync('server.key');
}

//var server = restify.createServer(opts);

//server.use(restify.CORS());
//server.use(restify.queryParser());
//server.use(restify.bodyParser());
//server.use(restifyValidator);

/*

server.post('/api/proof', proof.post);
server.put('/api/proof', proof.put);
server.get('/api/proof', proof.get);
server.patch('/api/proof', proof.patch);
server.post('/api/key', key.post);
server.get('/api/key', key.get);
*/

//server.use(cors());
server.use(bodyParser.json());
server.use(expressValidator());

server.use((req, res, next) => {
	console.log(`url: ${req.method} ${req.originalUrl} ${util.inspect(req.body || {})}`);
	return next();
});

server.use('/api', api);

https.createServer(sslOptions, server).listen(port, err => {
	if (err) return console.error(err);
	console.info(`server listening on port ${port}`);
});
