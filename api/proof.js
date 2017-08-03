'use strict';

var util = require('util');
var express = require('express');
var HttpStatus = require('http-status-codes');
var validate = require('jsonschema').validate;
var scehma = require('./schema');
var proof = require('../services/proof');

var app = express();

// TODO: move tracking_id to be part of the path params and not in the quetry string and remove it from the schema


/*
return object sample:

[ { tracking_id: 'id_KXaX8165zjlTavS%2BuEvK6agBpAXkl5jiI%2FmOmJX4%2Bps%3D',
    owner: '0xfcfe4d8a6df673465d9532befd917a6ed701c910',
    encrypted_proof: 
     { url: 'https://iberat2keys.blob.core.windows.net/attachments/FarmerID100/fw4.pdf',
       sas_token: 'https://iberat2keys.blob.core.windows.net/attachments/FarmerID100/fw4.pdf?sv=2016-05-31&sr=b&sig=02Zs2iqGi3l0E6EdXqjY7jeoT8mp1koZQ5pro4ukWyY%3D&se=2017-07-23T08%3A54%3A55Z&sp=r',
       document_name: 'fw4.pdf' },
    public_proof: 
     { encrypted_proof_hash: 'B5A4BB9BE43D9AD87CB85893F406D7035FC9233BDB21B43E504B7A8D47552AAF',
       public_proof: [Object] },
    previous_tracking_id: 'root' } ]

*/
app.get('/:tracking_id', async (req, res) => {

  req.checkParams('tracking_id', 'Invalid tracking_id').notEmpty();
  var errors = await req.getValidationResult();
  if (!errors.isEmpty()) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `there have been validation errors: ${util.inspect(errors.array())}` });
  }

  var trackingId = decodeURIComponent(req.params.tracking_id.trim());

  var opts = { 
    trackingId, 
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


app.put('/', async (req, res) => {
  if (!validate(req.body, scehma.proof.put).valid) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `invalid schema - expected schema is ${util.inspect(scehma.proof.put)}` });
  }
    
  try {
    var result = await proof.storeProof(req.body);   
  }
  catch(err) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }

  console.log(`sending result: ${util.inspect(result)}`);
  return res.json(result);
});

app.patch('/', async (req, res) => {
  if (!validate(req.body, scehma.proof.patch).valid) {
    return res.status(HttpStatus.BAD_REQUEST).json({ error: `invalid schema - expected schema is ${util.inspect(scehma.proof.patch)}` });
  }

  req.body.tracking_id = req.body.tracking_id;
  
  try {
    var result = await proof.transfer(req.body);
  }
  catch(err) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
  }

  return res.json(result);
});

module.exports = app;
