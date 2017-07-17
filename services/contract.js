'use strict';

var Web3 = require('web3');
var web3 = new Web3();
var util = require('util');
var abi = require('./abi');
var config = require('../config');

web3.setProvider(new Web3.providers.HttpProvider(config.GET_RPC_ENDPOINT));
var contractInstance = web3.eth.contract(abi).at(config.CONTRACT_ADDRESS);

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

