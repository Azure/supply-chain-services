'use strict';

var util = require('util');
var http = require('http');
var https = require('https');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
//var cors = require('express-cors');
var expressValidator = require('express-validator');

var api = require('./api');

var port = process.env.PORT || 443;
var development = process.env.NODE_ENV !== 'production';
var app = express();

var serverOptions = {};

if (development) {
  serverOptions.cert = fs.readFileSync('./cert/server.crt');
  serverOptions.key = fs.readFileSync('./cert/server.key');
}

// Ask Beat if we need cors... not sure if we do
//server.use(cors());
app.use(bodyParser.json());
app.use(expressValidator());

// middleware to log all incoming requests
app.use((req, res, next) => {
	console.log(`url: ${req.method} ${req.originalUrl} ${util.inspect(req.body || {})}`);
	return next();
});

// attach API to server
app.use('/api', api);

https.createServer(serverOptions, app).listen(port, err => {
	if (err) return console.error(err);
	console.info(`server is listening on port ${port}`);
});

// TODO add generic error handler
