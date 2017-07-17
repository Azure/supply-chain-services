'use strict';
var nconf = require('nconf');
var Web3 = require('web3');
var web3 = new Web3();
var sha256 = require('sha256');
var key = require('./key');
var contract = require('./contract');
var promisify = require("promisify-node");    
var util = require('util');
    



  function promisifyObject(source, funcs) {

    var obj = {};
    funcs.forEach(funcName => {
      obj[funcName] = function(cb) {
        source[funcName].apply(source, arguments);
      }
    });

    return promisify(obj, undefined, true);
  }

  var Promisified = {
    
    key: promisifyObject(key, [
        'decrypt'
      ])
  };




//var keyPromisified = promisify(key);

nconf.argv()
   .env()
   .file({ file: 'config.json' });

const userId = "un-authenticated";

const gethRpcEndpoint = nconf.get('geth_rpc_endpoint');
const contractAddress = nconf.get('deployed_contract_address');
const account = nconf.get('account_address');
const proofAbi = [ { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getPreviousTrackingId", "outputs": [ { "name": "previousTrackingId", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getEncryptedProof", "outputs": [ { "name": "encryptedProof", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getOwner", "outputs": [ { "name": "owner", "type": "address" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" } ], "name": "startTracking", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "previousTrackingId", "type": "string" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" } ], "name": "storeProof", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getProof", "outputs": [ { "name": "owner", "type": "address" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" }, { "name": "previousTrackingId", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getPublicProof", "outputs": [ { "name": "publicProof", "type": "string" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "newOwner", "type": "address" } ], "name": "transfer", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "inputs": [], "payable": false, "type": "constructor" } ];
web3.setProvider(new Web3.providers.HttpProvider(gethRpcEndpoint));
var contractInstance = web3.eth.contract(proofAbi).at(contractAddress);


async function getProof(opts) {
    console.log(`[services/proof:getProof] opts: ${util.inspect(opts)}`);
    
    if (!opts.trackingId) throw new Error(`missing argument 'trackingId'`);

    var trackingId = opts.trackingId;
    var decrypt = opts.decrypt;
    var proofs = [];

    while (trackingId && trackingId != "root") {

      var result = await contract.getProof(trackingId);
      var proof;

      if (!decrypt) 
        proof = result[1];
      else
      {
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

async function startTracking(opts) {
  console.log(`[services/proof:startTracking] opts: ${util.inspect(opts)}`);
    
  if (!opts.tracking_id) throw new Error(`missing argument 'tracking_id'`);
  if (!opts.public_proof) throw new Error(`missing argument 'public_proof'`);

  var proof = await createProof(opts);
  var result = await contract.startTracking(opts.tracking_id, opts.encrypted_proof, opts.public_proof, {from: account, gas : 2000000});

  console.log(`returning startTracking result: ${util.inspect(result)}`);
  return result;
}

async function createProof(opts) {
  console.log(`[services/proof:createProof] opts: ${util.inspect(opts)}`);
     
  if (!opts.tracking_id) throw new Error(`missing argument 'tracking_id'`);
  if (!opts.proof_to_encrypt) throw new Error(`missing argument 'proof_to_encrypt'`);

  var keyValue = await key.createKeyIfNotExist(userId, opts.tracking_id);

  var proofToEncryptStr = JSON.stringify(opts.proof_to_encrypt);
  var hash = sha256(proofToEncryptStr);
  opts.public_proof = JSON.stringify({
      encrypted_proof_hash : hash.toUpperCase(),
      public_proof : opts.public_proof
  });
  opts.encrypted_proof = key.encrypt(keyValue, proofToEncryptStr);
  return opts;
}

module.exports = {
    getProof,
    startTracking,
    storeProof: function(proof, next) {
        console.log(`[services/proof.js:storeProof] proof: ${proof}`);

        createProof(proof, function(proof) {
            contractInstance.storeProof(proof.tracking_id, proof.previous_tracking_id, proof.encrypted_proof, proof.public_proof, {from: account, gas : 2000000}, function(error, result){
                if (!error) {
                    return next(result);
                }
                else {
                    return next(error);
                }
            });
        });
    },
    transfer: function(transfer, next) {
      console.log(`[services/proof.js:transfer] transfer: ${transfer}`);

        contractInstance.transfer(transfer.tracking_id, transfer.transfer_to, {from: account, gas : 2000000}, function(error, result){
            if (!error) {
                return next(result);
            }
            else {
                return next(error);
            }
        });
    }
}
