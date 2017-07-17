'use strict';

var proof = require('../services/proof');
var validate = require('jsonschema').validate;
var util = require('util');
var express = require('express');
var HttpStatus = require('http-status-codes');
var scehma = require('./schema.json');

var app = express();

// TODO: move tracking_id to be part of the path params and not in the quetry string and remove it from the schema

app.get('/', async (req, res) => {

  req.checkQuery('tracking_id', 'Invalid tracking_id').notEmpty();
  var errors = await req.getValidationResult();
  if (!errors.isEmpty()) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `there have been validation errors: ${util.inspect(errors.array())}` });
  }

  var opts = { 
    trackingId: encodeURIComponent(req.query.tracking_id), 
    decrypt: req.sanitizeQuery('decrypt').toBoolean()
  };

  console.log(`getting proof for ${util.inspect(opts)}`);

  try {
    var result = await proof.getProof(opts);
  }
  catch(err) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }

  if (!result) {
    return res.status(HttpStatus.NOT_FOUND).json({ error: `tracking id '${opts.trackingId}' not found` });
  }

  console.log(`sending result: ${util.inspect(result)}`);
  return res.json(result);
});


app.post('/', async (req, res) => {

  if (!validate(req.body, scehma.proof.post).valid) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `invalid schema - expected schema is ${util.inspect(scehma.proof.post)}` });
  }

  req.body.tracking_id = encodeURIComponent(req.body.tracking_id);

  try {
    var result = await proof.startTracking(req.body);
  }
  catch(err) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }

  console.log(`sending result: ${util.inspect(result)}`);
  // TODO: check what should we return here.. this should be json probably...
  return res.end(result);
});


// TODO: test below APIs

app.put('/', async (req, res) => {
  if (!validate(req.body, scehma.proof.put).valid) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `invalid schema - expected schema is ${util.inspect(scehma.proof.put)}` });
  }

  req.body.tracking_id = encodeURIComponent(req.body.tracking_id);
  req.body.previous_tracking_id = encodeURIComponent(req.body.previous_tracking_id);
    
  var result = await proof.storeProof(req.body);

  // TODO: check what should we return here.. this should be json probably...
  return res.end(result);
  
});

app.patch('/', async (req, res) => {
  if (!validate(req.body, scehma.proof.patch).valid) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `invalid schema - expected schema is ${util.inspect(scehma.proof.patch)}` });
  }

  req.body.tracking_id = encodeURIComponent(req.body.tracking_id);
       
  var result = await proof.transfer(req.body);

  // TODO: check what should we return here.. this should be json probably...
  return res.end(result);
});

module.exports = app;
