'use strict';

var proof = require(`../services/proof.js`),
    restify = require('restify'),
    validate = require('jsonschema').validate,
    util = require('util');

validate.throwError = true;

var proofPostSchema = {
    "id": "/ProofPost",
    "type": "object",
    "properties": {
        "tracking_id": { "type": "string" },
        "proof_to_encrypt": { "type": "object" },
        "public_proof": { "type": "object" }
    },
    "required": ["tracking_id", "proof_to_encrypt", "public_proof"]
};
var proofPutSchema = {
    "id": "/ProofPost",
    "type": "object",
    "properties": {
        "tracking_id": { "type": "string" },
        "previous_tracking_id" : { "type" : "string" },
        "proof_to_encrypt": { "type": "object" },
        "public_proof": { "type": "object" }
    },
    "required": ["tracking_id", "previous_tracking_id", "proof_to_encrypt", "public_proof"]
};
var proofPatchSchema = {
    "id": "/ProofPost",
    "type": "object",
    "properties": {
        "tracking_id": { "type": "string" },
        "transfer_tor" : { "type" : "string" }
    },
    "required": ["tracking_id", "transfer_to"]
};

module.exports = {

    get: async function (req, res, next) {
      req.assert('tracking_id', 'Invalid tracking_id').notEmpty();

      var errors = req.validationErrors();
      if (errors)
        return res.send(500 ,`There have been validation errors: ${util.inspect(errors)}`);
  
      var opts = { 
        trackingId: encodeURIComponent(req.query.tracking_id), 
        decrypt: req.sanitize('decrypt').toBoolean()
      };

      console.log(`getting proof for ${JSON.stringify(opts, true, 2)}`);

      try {
        var result = await proof.getProof(opts);
      }
      catch(err) {
        return next(new restify.InternalServerError(err.message));
      }

      if (!result)
        return next(new restify.ResourceNotFoundError(`tracking id '${opts.trackingId}' not found`));
     
      console.log(`sending result: ${JSON.stringify(result, true, 2)}`);
        return res.json(result);
    },

    post: function (req, res, next) {
        if (validate(req.body, proofPostSchema).valid) {
            req.body.tracking_id = encodeURIComponent(req.body.tracking_id);
            proof.startTracking(req.body, function(result){
                res.send(result);
                return next();
            });
        }
        else {
            return next(new restify.InvalidArgumentError("invalid schema - correct schema is " + JSON.stringify(proofPostSchema)));
        }
    },
    put: function (req, res, next) {
        if (validate(req.body, proofPutSchema).valid) {
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
        if (validate(req.body, proofPatchSchema).valid) {
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