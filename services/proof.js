'use strict';
var nconf = require('nconf'),
    Web3 = require('web3'),
    web3 = new Web3();

nconf.argv()
   .env()
   .file({ file: 'config.json' });

const gethRpcEndpoint = nconf.get('geth_rpc_endpoint');
const contractAddress = nconf.get('deployed_contract_address');
const account = nconf.get('account_address');
const proofAbi = [ { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getPreviousTrackingId", "outputs": [ { "name": "previousTrackingId", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getEncryptedProof", "outputs": [ { "name": "encryptedProof", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getOwner", "outputs": [ { "name": "owner", "type": "address" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" } ], "name": "startTracking", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "previousTrackingId", "type": "string" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" } ], "name": "storeProof", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getProof", "outputs": [ { "name": "owner", "type": "address" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" }, { "name": "previousTrackingId", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getPublicProof", "outputs": [ { "name": "publicProof", "type": "string" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "newOwner", "type": "address" } ], "name": "transfer", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "inputs": [], "payable": false, "type": "constructor" } ];
web3.setProvider(new Web3.providers.HttpProvider(gethRpcEndpoint));
var contractInstance = web3.eth.contract(proofAbi).at(contractAddress);

function callGetProof(trackingId, proofs, next){
    contractInstance.getProof.call(trackingId , function(error, result){
        if (!error) {
            proofs.push({
                "tracking_id" : trackingId,
                "owner" : result[0],
                "encrypted_proof" : result[1],
                "public_proof" : result[2],
                "previous_tracking_id" : result[3]
            });
            var previousTrackingId =  result[3];
            if ((previousTrackingId != "root" ) && (previousTrackingId != "")) {
                callGetProof(previousTrackingId, proofs, next)
            }
            else {
                next(proofs);
            }
        }
        else {
            next(error);
        }
    });
}
module.exports = {
    getProof: function (trackingId, next) {
        var proofs = [];
        callGetProof(trackingId, proofs, next);
    },
    startTracking: function(proof, next) {
        contractInstance.startTracking(proof.tracking_id, proof.encrypted_proof, proof.public_proof, {from: account, gas : 2000000}, function(error, result){
            if (!error) {
                next(JSON.stringify(result));
            }
            else {
                next(error);
            }
        });
    },
    storeProof: function(proof, next) {
        contractInstance.storeProof(proof.tracking_id, proof.previous_tracking_id, proof.encrypted_proof, proof.public_proof, {from: account, gas : 2000000}, function(error, result){
            if (!error) {
                next(result);
            }
            else {
                next(error);
            }
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
