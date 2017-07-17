'use strict';

var util = require('util');
var express = require('express');
var HttpStatus = require('http-status-codes');
var validate = require('jsonschema').validate;
var scehma = require('./schema');
var key = require('../services/key');

const userId = "un-authenticated";

var app = express();

// TODO: test below APIs

// TODO: move key_id to params instead of query string

app.get('/', async (req, res) => {

  req.checkQuery('key_id', 'Invalid key_id').notEmpty();
  var errors = await req.getValidationResult();
  if (!errors.isEmpty()) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `there have been validation errors: ${util.inspect(errors.array())}` });
  }

  var userId = encodeURIComponent(userId);
  req.query.key_id = encodeURIComponent(req.query.key_id);

  try {
    var result = await key.getPublicKey(userId, req.query.key_id);
  }
  catch(err) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }

  if (!result) {
    return res.status(HttpStatus.NOT_FOUND).json({ error: `key id '${req.query.key_id}' not found` });
  }

  console.log(`sending result: ${util.inspect(result)}`);
  return res.json(result);
});

app.post('/', async (req, res) => {

  if (!validate(req.body, scehma.key.post).valid) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `invalid schema - expected schema is ${util.inspect(scehma.key.post)}` });
  }

  var userId = encodeURIComponent(userId);
  req.body.key_id = encodeURIComponent(req.body.key_id);
            
  try {
    var result = await key.createKey(userId, req.body.key_id);
  }
  catch(err) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }

  console.log(`sending result: ${util.inspect(result)}`);
  return res.json({ result });
});


module.exports = app;