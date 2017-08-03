'use strict';

var sha256 = require('sha256');
var util = require('util');

var key = require('./key');
var contract = require('./contract');
var config = require('../config');

// TODO move userId to options object in each API
const userId = "un-authenticated";

async function getProof(opts) {
    console.log(`[services/proof:getProof] opts: ${util.inspect(opts)}`);
    
    if (!opts.trackingId) throw new Error(`missing argument 'trackingId'`);

    var trackingId = opts.trackingId;
    var decrypt = opts.decrypt;
    var proofs = [];

    while (trackingId && trackingId != "root") {

      var result = await contract.getProof(trackingId);
      // TODO wrap getProof and return null if doesn't exists
      var proof;

      if (!decrypt) {
        proof = result[1];
      }
      else {
        var decrypted = await key.decrypt(userId, trackingId, result[1]);

        // ensure we always return a valid json, even if we get back a string
        var decryptedJson = { raw_content : decrypted};

        try {
          decryptedJson = JSON.parse(decrypted);
        }
        catch(ex) {
          console.warn(`invalid decrypted json: ${decrypted}`);
        };

        proof = decryptedJson;     
      }

      // check if we got a valid proof
      if (result[3].length > 0) {
        proofs.push({
            tracking_id: trackingId,
            owner: result[0],
            encrypted_proof: proof,
            public_proof: result[2].length > 0 ? JSON.parse(result[2]) : result[2],
            previous_tracking_id: result[3]
        });

        trackingId = result[3];
      }
    }
    
    return proofs;
}

async function storeProof(opts) {
  console.log(`[services/proof:storeProof] opts: ${util.inspect(opts)}`);
    
  if (!opts.tracking_id) throw new Error(`missing argument 'tracking_id'`);
  if (!opts.public_proof) throw new Error(`missing argument 'public_proof'`);

  opts.previous_tracking_id = opts.previous_tracking_id || "root";

  var proof = await createProof(opts);
  var result = await contract.storeProof(opts.tracking_id, opts.previous_tracking_id, opts.encrypted_proof, opts.public_proof, { from: config.ACCOUNT_ADDRESS, gas : config.GAS });

  console.log(`returning storeProof result: ${util.inspect(result)}`);
  return result;
}

async function createProof(opts) {
  console.log(`[services/proof:createProof] opts: ${util.inspect(opts)}`);
     
  if (!opts.tracking_id) throw new Error(`missing argument 'tracking_id'`);
  if (!opts.proof_to_encrypt) throw new Error(`missing argument 'proof_to_encrypt'`);

  var proofToEncryptStr = JSON.stringify(opts.proof_to_encrypt);
  var hash = sha256(proofToEncryptStr);
  opts.public_proof = JSON.stringify({
    encrypted_proof_hash : hash.toUpperCase(),
    public_proof : opts.public_proof
  });
  opts.encrypted_proof = await key.encrypt(userId, opts.tracking_id, proofToEncryptStr);
  return opts;
}

async function transfer(opts) {
  // TODO: add input validation as implemented in above functions

  var result = await contract.transfer(transfer.tracking_id, transfer.transfer_to, { from: config.ACCOUNT_ADDRESS, gas : config.GAS });
  return result;  
}

module.exports = {
  getProof,
  storeProof,
  transfer
}
