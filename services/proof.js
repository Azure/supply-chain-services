var Web3 = require('web3');
var web3 = new Web3();

// const gethRpcEndpoint = 'http://10.0.0.4:8545';
const gethRpcEndpoint = 'http://localhost:8545';
const contractAddress = '0xeef93f08bbc492fc82be38ad6876ecda483fc2ca';
const account = '0xac26392638a86b300e738a6fa510dc37091fde99';
const proofAbi = [ { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getPreviousTrackingId", "outputs": [ { "name": "previousTrackingId", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getEncryptedProof", "outputs": [ { "name": "encryptedProof", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getOwner", "outputs": [ { "name": "owner", "type": "address" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" } ], "name": "startTracking", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "previousTrackingId", "type": "string" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" } ], "name": "storeProof", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getProof", "outputs": [ { "name": "owner", "type": "address" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" }, { "name": "previousTrackingId", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getPublicProof", "outputs": [ { "name": "publicProof", "type": "string" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "newOwner", "type": "address" } ], "name": "transfer", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "inputs": [], "payable": false, "type": "constructor" } ];
web3.setProvider(new Web3.providers.HttpProvider(gethRpcEndpoint));
var contractInstance = web3.eth.contract(proofAbi).at(contractAddress);

module.exports = {
    getProof: function (trackingId, next) {
        try {
            reply = contractInstance.getProof.call(trackingId , function(error, result){
                if (!error) {
                    next({
                        "tracking_id" : trackingId,
                        "owner" : result[0],
                        "encrypted_proof" : result[1],
                        "public_proof" : result[2],
                        "previous_tracking_id" : result[3]
                    });
                }
                else {
                    next(error);
                }
            });
        }
        catch (err) {
            next(err.message);
        }
    },
    startTracking: function(proof, next) {
        reply = contractInstance.startTracking(proof.tracking_id, proof.encrypted_proof, proof.public_proof, {from: account, gas : 2000000}, function(error, result){
            if (!error) {
                next(JSON.stringify(result));
            }
            else {
                next(error);
            }
        });
    },
    storeProof: function(proof, next) {
        reply = contractInstance.storeProof(proof.tracking_id, proof.previous_tracking_id, proof.encrypted_proof, proof.public_proof, {from: account, gas : 2000000}, function(error, result){
            if (!error) {
                next(result);
            }
            else {
                next(error);
            }
        });
    },
    transfer: function(transfer, next) {
        reply = contractInstance.transfer(transfer.tracking_id, transfer.transfer_to, {from: account, gas : 2000000}, function(error, result){
            if (!error) {
                next(result);
            }
            else {
                next(error);
            }
        });
    }
}
