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
var isProd = process.env.NODE_ENV === 'production';
var app = express();
var serverOptions = {};

if (isProd) {

	// in prod, enforce secured connections
	app.use((req, res, next) => {
		if (!req.headers['x-arr-ssl']) {
			return res.status(HttpStatus.BAD_REQUEST).json({ error: 'use https'});
		}
		return next();
	});
}
else {  
	serverOptions.cert = fs.readFileSync('./cert/server.crt');
  serverOptions.key = fs.readFileSync('./cert/server.key');
}

// Ask Beat if we need cors... not sure if we do
//server.use(cors());
app.use(bodyParser.json());
app.use(expressValidator());

// middleware to log all incoming requests
app.use((req, res, next) => {
	console.log(`url: ${req.method} ${req.originalUrl} ${util.inspect(req.body || {})}, headers: ${util.inspect(req.headers)}`);
	return next();
});

// attach API to server
app.use('/api', api);

app.get('/', (req, res) => {
	return res.end(`iBera Service in on...`);
});

if (isProd) {
	// in prod we will use Azure's certificate to use ssl.
	// so no need to use https here with a custom certificate for now.
	// enforcing https in prod is being done on the first middleware (see above)
	http.createServer(app).listen(port, err => {
		if (err) return console.error(err);
		console.info(`server is listening on port ${port}`);
	});
}
else {
	// this is development environment, use a local ssl server with self signed certificates
	https.createServer(serverOptions, app).listen(port, err => {
		if (err) return console.error(err);
		console.info(`server is listening on port ${port}`);
	});
}
