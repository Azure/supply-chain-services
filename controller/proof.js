'use strict';

var proof = require(`../services/proof.js`),
    restify = require('restify'),
    validate = require('jsonschema').validate;
validate.throwError = true;

var proofPostSchema = {
    "id": "/ProofPost",
    "type": "object",
    "properties": {
        "tracking_id": { "type": "string" },
        "encrypted_proof": { "type": "string" },
        "public_proof": { "type": "object" }
    },
    "required": ["tracking_id", "encrypted_proof", "public_proof"]
};
var proofPutSchema = {
    "id": "/ProofPost",
    "type": "object",
    "properties": {
        "tracking_id": { "type": "string" },
        "previous_tracking_id" : { "type" : "string" },
        "encrypted_proof": { "type": "string" },
        "public_proof": { "type": "object" }
    },
    "required": ["tracking_id", "previous_tracking_id", "encrypted_proof", "public_proof"]
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
    get: function (req, res, next) {
        req.assert('tracking_id', 'Invalid tracking_id').notEmpty();
        req.assert('decrypt', 'Invalid decrypt value - needs to be a Boolean').notEmpty();
        if (!req.validationErrors()) {
            proof.getProof(req.query.tracking_id, req.query.decrypt, function (result) {
                if (result != null) {
                    res.send(result);
                }
                else {
                    next(new restify.ResourceNotFoundError("No resource with tracking_id " + req.query.tracking_id));
                }
                next();
            });
        }
        else {
            next(new restify.ResourceNotFoundError("query format is ?tracking_id=xyz&decrypt=true"));
        }
    },
    post: function (req, res, next) {
        if (validate(req.body, proofPostSchema).valid) {
            proof.startTracking(req.body, function(result){
                res.send(result);
                next();
            });
        }
        else {
            error(new restify.InvalidArgumentError("invalid schema - correct schema is " + JSON.stringify(proofPostSchema)));
        }
    },
    put: function (req, res, next) {
        if (validate(req.body, proofPutSchema).valid) {
            proof.storeProof(req.body, function (result) {
                res.send(result);
                next();
            });
        }
        else {
            next(new restify.InvalidArgumentError("invalid schema - correct schema is " + JSON.stringify(proofPutSchema)));
        }
    },
    patch: function (req, res, next) {
        if (validate(req.body, proofPatchSchema).valid) {
            proof.transfer(req.body, function (result) {
                res.send(result);
                next();
            });
        }
        else {
            next(new restify.InvalidArgumentError("invalid schema - correct schema is " + JSON.stringify(proofPatchSchema)));
        }
    }
}