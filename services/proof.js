'use strict';
var nconf = require('nconf'),
    Web3 = require('web3'),
    web3 = new Web3(),
    sha256 = require('sha256'),
    key = require('./key.js'),
    contract = require('./contract'),
    promisify = require("promisify-node");



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


async function callGetProof(opts) {
    console.log(`[services/proof.js:callGetProof] opts: ${JSON.stringify(opts, true, 2)}`);
    
    var trackingId = opts.trackingId;
    var decrypt = opts.decrypt;
    var proofs = opts.proofs;

    try {
      var result = await contract.getProof(trackingId);
    }
    catch(err) {
      console.error(`error getting result from blockchain for trackingId: ${trackingId}`);
      throw err;
    }

    var proof;

    if (decrypt) {
        try {
          var decrypted = await key.decrypt(userId, trackingId, result[1]);
          // ensure we always return a valid json, even if we get back a string
          var decryptedJson = { raw_content : decrypted};
          decryptedJson = JSON.parse(decrypted);
        }
        catch(ex){
          throw ex;
        };
        proof = decryptedJson;     
      }
      else {
          proof = result[1];
      }

      var encryptedProofJson = proof;
      // check if we got a valid proof
      if (result[3].length > 0)
      {
          proofs.push({
              "tracking_id" : trackingId,
              "owner" : result[0],
              "encrypted_proof" : encryptedProofJson,
              "public_proof" : result[2].length > 0 ? JSON.parse(result[2]) : result[2],
              "previous_tracking_id" : result[3]
          });
          var previousTrackingId =  result[3];
          if (previousTrackingId && previousTrackingId != "root") {
//                        await callGetProof({trackingId: previousTrackingId, decrypt, proofs }, next)
          }
          else {
              return proofs;
          }
      }
      else {
          return;
      }
}


function callGetProof_(opts, cb) {

    console.log(`[services/proof.js:callGetProof] opts: ${JSON.stringify(opts, true, 2)}`);

    var trackingId = opts.trackingId;
    var decrypt = opts.decrypt;
    var proofs = opts.proofs;

    contractInstance.getProof.call(trackingId , function(error, result){
        if (!error) {
            let pushProof = function(encryptedProofStr){
                var encryptedProofJson = encryptedProofStr;
                // check if we got a valid proof
                if (result[3].length > 0)
                {
                    proofs.push({
                        "tracking_id" : trackingId,
                        "owner" : result[0],
                        "encrypted_proof" : encryptedProofJson,
                        "public_proof" : result[2].length > 0 ? JSON.parse(result[2]) : result[2],
                        "previous_tracking_id" : result[3]
                    });
                    var previousTrackingId =  result[3];
                    if ((previousTrackingId != "root" ) && (previousTrackingId != "")) {
                        callGetProof({trackingId: previousTrackingId, decrypt, proofs }, next)
                    }
                    else {
                        return cb(null, proofs);
                    }
                }
                else {
                    return cb();
                }
            }
            if (decrypt == "true") {
                key.decrypt(userId, trackingId, result[1], function(decrypted) {
                    // ensure we always return a valid json, even if we get back a string
                    var decryptedJson = { raw_content : decrypted};
                    try {
                        decryptedJson = JSON.parse(decrypted);
                    }
                    catch(ex){
                        
                    };
                    pushProof(decryptedJson);     
                }); 
            }
            else {
                pushProof(result[1]);
            }
        }
        else {
            return cb();
        }
    });
}


function createProof(proof, next){
 // console.log(`[services/proof.js:createProof] opts: ${JSON.stringify(opts, true, 2)}`);
  console.log(`[services/proof.js:createProof] opts: ${proof}`);

    key.createKeyIfNotExist(userId, proof.tracking_id, function(keyValue){
        var proofToEncryptStr = JSON.stringify(proof.proof_to_encrypt);
        var hash = sha256(proofToEncryptStr);
        proof.public_proof = JSON.stringify({
            encrypted_proof_hash : hash.toUpperCase(),
            public_proof : proof.public_proof
        });
        proof.encrypted_proof = key.encrypt(keyValue, proofToEncryptStr);
        return next(proof);
    });
}
module.exports = {
    getProof: function(opts) {
      opts.proofs = [];
      return callGetProof(opts);
    },
    getProof_: async function (opts, cb) {
        opts.proofs = [];
        return await callGetProof(opts, cb);
    },
    startTracking: function(proof, next) {
        console.log(`[services/proof.js:startTracking] proof: ${proof}`);

         createProof(proof, function(proof) {
            contractInstance.startTracking(proof.tracking_id, proof.encrypted_proof, proof.public_proof, {from: account, gas : 2000000}, function(error, result){
                if (!error) {
                    return next(JSON.stringify(result));
                }
                else {
                    return next(error);
                }
            });
        });
    },
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
