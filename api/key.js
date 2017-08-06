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

app.get('/:keyId', async (req, res) => {

  req.checkParams('keyId', 'Invalid keyId').notEmpty();
  var errors = await req.getValidationResult();
  if (!errors.isEmpty()) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `there have been validation errors: ${util.inspect(errors.array())}` });
  }

  var keyId = decodeURIComponent(req.params.keyId);

  try {
    var result = await key.getPublicKey(userId, keyId);
  }
  catch(err) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }

  if (!result) {
    return res.status(HttpStatus.NOT_FOUND).json({ error: `key id '${keyId}' not found` });
  }

  console.log(`sending result: ${util.inspect(result)}`);
  return res.json(result);
});

app.post('/', async (req, res) => {

  if (!validate(req.body, scehma.key.post).valid) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `invalid schema - expected schema is ${util.inspect(scehma.key.post)}` });
  }
            
  try {
    var result = await key.createKey(userId, req.body.keyId);
  }
  catch(err) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }

  console.log(`sending result: ${util.inspect(result)}`);
  return res.json({ result });
});


module.exports = app;