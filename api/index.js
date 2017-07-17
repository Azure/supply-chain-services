
var express = require('express');
var app = express();

var proof = require('./proof');
var key = require('./key');

app.use('/proof', proof);
app.use('/key', key);

module.exports = app;
