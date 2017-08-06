'use strict';

var util = require('util');
var express = require('express');
var HttpStatus = require('http-status-codes');
var validate = require('jsonschema').validate;
var scehma = require('./schema');
var proof = require('../services/proof');

var app = express();


app.get('/:trackingId', async (req, res) => {

  req.checkParams('trackingId', 'Invalid trackingId').notEmpty();
  var errors = await req.getValidationResult();
  if (!errors.isEmpty()) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `there have been validation errors: ${util.inspect(errors.array())}` });
  }

  var trackingId = decodeURIComponent(req.params.trackingId.trim());

  var opts = { 
    trackingId, 
    decrypt: req.sanitizeQuery('decrypt').toBoolean()
  };

  console.log(`getting proof for ${util.inspect(opts)}`);

  try {
    var result = await proof.getProof(opts);
  }
  catch(err) {
    console.error(`error getting proof: ${err.message}`);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }

  if (!result) {
    console.warn(`tracking id '${opts.trackingId}' not found`);
    return res.status(HttpStatus.NOT_FOUND).json({ error: `tracking id '${opts.trackingId}' not found` });
  }

  console.log(`sending result: ${util.inspect(result)}`);
  return res.json(result);
});


app.put('/', async (req, res) => {
  if (!validate(req.body, scehma.proof.put).valid) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `invalid schema - expected schema is ${util.inspect(scehma.proof.put)}` });
  }
    
  try {
    var result = await proof.storeProof(req.body);   
  }
  catch(err) {
    console.error(`error storing proof: ${err.message}`);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }

  console.log(`sending result: ${util.inspect(result)}`);
  return res.json(result);
});


app.patch('/', async (req, res) => {
  if (!validate(req.body, scehma.proof.patch).valid) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `invalid schema - expected schema is ${util.inspect(scehma.proof.patch)}` });
  }
  
  try {
    var result = await proof.transfer(req.body);
  }
  catch(err) {
    console.error(`error transfering ownership: ${err.message}`);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }

  return res.json(result);
});

module.exports = app;
