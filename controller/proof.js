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
    get: function (req, res, next) {
        req.assert('tracking_id', 'Invalid tracking_id').notEmpty();
        req.assert('decrypt', 'Invalid decrypt value - needs to be a Boolean').notEmpty();
        if (!req.validationErrors()) {
            req.query.tracking_id = encodeURIComponent(req.query.tracking_id);
            proof.getProof(req.query.tracking_id, req.query.decrypt, function (result) {
                if (result != null) {
                    res.send(result);
                    return next();
                }
                else {
                    return next(new restify.ResourceNotFoundError("No resource found"));
                }
            });
        }
        else {
            return next(new restify.ResourceNotFoundError("query format is ?tracking_id=xyz&decrypt=true"));
        }
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