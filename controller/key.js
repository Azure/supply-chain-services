'use strict';

var proof = require(`../services/key.js`),
    restify = require('restify'),
    validate = require('jsonschema').validate;
validate.throwError = true;

var keyPostSchema = {
    "id": "/ProofPost",
    "type": "object",
    "properties": {
        "key_id": { "type": "string" }
    },
    "required": ["key_id"]
};

const userId = "un-authenticated";

module.exports = {
    get: function (req, res, next) {
        req.assert('key_id', 'Invalid key_id').notEmpty();
        if (!req.validationErrors()) {
            proof.getPublicKey(userId, req.query.key_id, function (result) {
                res.send(result);
                next();
            });
        }
        else {
            next(new restify.ResourceNotFoundError("query format is ?key_id=xyz"));
        }
    },
    post: function (req, res, next) {
        if (validate(req.body, keyPostSchema).valid) {
            proof.createKey(userId, req.body.key_id, function(result){
                res.send(result);
                next();
            });
        }
        else {
            error(new restify.InvalidArgumentError("invalid schema - correct schema is " + JSON.stringify(keyPostSchema)));
        }
    }
}