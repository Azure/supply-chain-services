'use strict';

var proof = require('../services/proof');
var restify = require('restify');
var validate = require('jsonschema').validate;
var util = require('util');

var scehma = require('./schema.json');

validate.throwError = true;


async function get(req, res, next) {
  console.log(`[controller/proof:get]`);

  req.assert('tracking_id', 'Invalid tracking_id').notEmpty();
  var errors = req.validationErrors();
  if (errors) {
    return next(new restify.InvalidArgumentError(`There have been validation errors: ${util.inspect(errors)}`));
  }

  var opts = { 
    trackingId: encodeURIComponent(req.query.tracking_id), 
    decrypt: req.sanitize('decrypt').toBoolean()
  };

  console.log(`getting proof for ${util.inspect(opts)}`);

  try {
    var result = await proof.getProof(opts);
  }
  catch(err) {
    return next(new restify.InternalServerError(err.message));
  }

  if (!result) {
    return next(new restify.ResourceNotFoundError(`tracking id '${opts.trackingId}' not found`));
  }

  console.log(`sending result: ${util.inspect(result)}`);
  return res.json(result);
}

async function post(req, res, next) {
  console.log(`[controller/proof:post] body: ${util.inspect(req.body)}`);

  if (!validate(req.body, scehma.proof.post).valid) {
    return next(new restify.InvalidArgumentError(`invalid schema - correct schema is ${util.inspect(proofPostSchema)}`));
  }

  req.body.tracking_id = encodeURIComponent(req.body.tracking_id);

  try {
    var result = proof.startTracking(req.body);
  }
  catch(err) {
    return next(new restify.InternalServerError(err.message));
  }

  console.log(`sending result: ${util.inspect(result)}`);
  // TODO: check what should we return here.. this should be json probably...
  return res.send(result);
}

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