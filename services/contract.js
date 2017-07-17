'use strict';

var Web3 = require('web3');
var web3 = new Web3();
var util = require('util');
var nconf = require('../config');

const gethRpcEndpoint = nconf.get('geth_rpc_endpoint');
const contractAddress = nconf.get('deployed_contract_address');
const proofAbi = [ { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getPreviousTrackingId", "outputs": [ { "name": "previousTrackingId", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getEncryptedProof", "outputs": [ { "name": "encryptedProof", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getOwner", "outputs": [ { "name": "owner", "type": "address" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" } ], "name": "startTracking", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "previousTrackingId", "type": "string" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" } ], "name": "storeProof", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getProof", "outputs": [ { "name": "owner", "type": "address" }, { "name": "encryptedProof", "type": "string" }, { "name": "publicProof", "type": "string" }, { "name": "previousTrackingId", "type": "string" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "trackingId", "type": "string" } ], "name": "getPublicProof", "outputs": [ { "name": "publicProof", "type": "string" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "trackingId", "type": "string" }, { "name": "newOwner", "type": "address" } ], "name": "transfer", "outputs": [ { "name": "success", "type": "bool" } ], "payable": false, "type": "function" }, { "inputs": [], "payable": false, "type": "constructor" } ];
web3.setProvider(new Web3.providers.HttpProvider(gethRpcEndpoint));
var contractInstance = web3.eth.contract(proofAbi).at(contractAddress);


// wrap following functions with a promise so that we can use it with the async convention
// and add it on the module.exports object
[ 
  'getProof',
  'startTracking',
  'storeProof',
  'transfer'
]
  .forEach(fname => {

    (function(fname) {
      exports[fname] = function() {
        return new Promise((resolve, reject) => {
          console.log(`executing function '${fname}' on contract with params ${util.inspect(arguments)}`);

          // callback for the function invoked
          var cb = (err, result) => {
            if (err) {
              console.error(`error executing function '${fname}' on contract with params: ${util.inspect(arguments)}: ${err.message}`);
              return reject(err);
            }
            console.log(`function '${fname}' on contract completed successfully. result: ${util.inspect(result)}`);
            return resolve(result);
          };

          // extract original params and add the callback to the list
          var params = Array.prototype.slice.call(arguments);
          params.push(cb);

          // invoke requested method on the contract
          return contractInstance[fname].apply(contractInstance, params);
        });
      }
    })(fname);

});

