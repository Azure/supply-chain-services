'use strict';
var nconf = require('nconf'),
    Web3 = require('web3'),
    web3 = new Web3(),
    sha256 = require('sha256'),
    key = require('./key.js');

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

function callGetProof(trackingId, decrypt, proofs, next){
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
                        callGetProof(previousTrackingId, decrypt, proofs, next)
                    }
                    else {
                        next(proofs);
                    }
                }
                else {
                    next(null);
                }
            }
            if (decrypt == "true") {
                key.decrypt(userId, trackingId, result[1], function(decrypted) {
                    pushProof(decrypted.length==0 ? {} : JSON.parse(decrypted));     
                }); 
            }
            else {
                pushProof(result[1]);
            }
        }
        else {
            next(null);
        }
    });
}

function createProof(proof, next){
    key.createKeyIfNotExist(userId, proof.tracking_id, function(keyValue){
        var proofToEncryptStr = JSON.stringify(proof.proof_to_encrypt);
        var hash = sha256(proofToEncryptStr);
        proof.public_proof = JSON.stringify({
            encrypted_proof_hash : hash.toUpperCase(),
            public_proof : proof.public_proof
        });
        proof.encrypted_proof = key.encrypt(keyValue, proofToEncryptStr);
        next(proof);
    });
}
module.exports = {
    getProof: function (trackingId, decrypt, next) {
        var proofs = [];
        callGetProof(trackingId, decrypt, proofs, next);
    },
    startTracking: function(proof, next) {
         createProof(proof, function(proof) {
            contractInstance.startTracking(proof.tracking_id, proof.encrypted_proof, proof.public_proof, {from: account, gas : 2000000}, function(error, result){
                if (!error) {
                    next(JSON.stringify(result));
                }
                else {
                    next(error);
                }
            });
        });
    },
    storeProof: function(proof, next) {
        createProof(proof, function(proof) {
            contractInstance.storeProof(proof.tracking_id, proof.previous_tracking_id, proof.encrypted_proof, proof.public_proof, {from: account, gas : 2000000}, function(error, result){
                if (!error) {
                    next(result);
                }
                else {
                    next(error);
                }
            });
        });
    },
    transfer: function(transfer, next) {
        contractInstance.transfer(transfer.tracking_id, transfer.transfer_to, {from: account, gas : 2000000}, function(error, result){
            if (!error) {
                next(result);
            }
            else {
                next(error);
            }
        });
    }
}
