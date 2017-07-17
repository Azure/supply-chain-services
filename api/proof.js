'use strict';

var proof = require('../services/proof');
var restify = require('restify');
var validate = require('jsonschema').validate;
var util = require('util');
var express = require('express');
var HttpStatus = require('http-status-codes');
var scehma = require('./schema.json');

var app = express();

app.get('/', async (req, res) => {
  console.log(`[controller/proof:get]`);

  req.checkQuery('tracking_id', 'Invalid tracking_id').notEmpty();
  var errors = await req.getValidationResult();
  if (!errors.isEmpty()) {
    return res.status(HttpStatus.BAD_REQUEST).end(`There have been validation errors: ${util.inspect(errors.array())}`);
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
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).end(err.message);
  }

  if (!result) {
    return res.status(HttpStatus.NOT_FOUND).end(`tracking id '${opts.trackingId}' not found`);
  }

  console.log(`sending result: ${util.inspect(result)}`);
  return res.json(result);
});


app.post('/', async (req, res) => {
  console.log(`[controller/proof:post] body: ${util.inspect(req.body)}`);

  if (!validate(req.body, scehma.proof.post).valid) {
    return res.status(HttpStatus.BAD_REQUEST).end(`invalid schema - correct schema is ${util.inspect(proofPostSchema)}`);
  }

  req.body.tracking_id = encodeURIComponent(req.body.tracking_id);

  try {
    var result = proof.startTracking(req.body);
  }
  catch(err) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).end(err.message);
  }

  console.log(`sending result: ${util.inspect(result)}`);
  // TODO: check what should we return here.. this should be json probably...
  return res.send(result);
});

module.exports = app;

/*
module.exports = {
  get,
  post,
    put: function (req, res, next) {
        if (validate(req.body, scehma.proof.put).valid) {
            req.body.tracking_id = encodeURIComponent(req.body.tracking_id);
            req.body.previous_tracking_id = encodeURIComponent(req.body.previous_tracking_id);
            proof.storeProof(req.body, function (result) {
                res.send(result);
                return next();
            });
        }
        else {
            next(new restify.InvalidArgumentError("invalid schema - correct schema is " + JSON.stringify(proofPutSchema)));
        }
    },
    patch: function (req, res, next) {
        req.body.tracking_id = encodeURIComponent(req.body.tracking_id);
        if (validate(req.body, scehma.proof.patch).valid) {
            proof.transfer(req.body, function (result) {
                res.send(result);
                return next();
            });
        }
        else {
            return next(new restify.InvalidArgumentError("invalid schema - correct schema is " + JSON.stringify(proofPatchSchema)));
        }
    }
}

*/