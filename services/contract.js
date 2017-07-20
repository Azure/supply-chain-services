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
// TODO: auto generate from abi
[ 
  { name: 'getProof', method: 'call' },
  { name: 'startTracking', method: 'sendTransaction' },
  { name: 'storeProof', method: 'sendTransaction' },  
  { name: 'transfer', method: 'sendTransaction' }
]
  .forEach(func => {

    (function(func) {
      exports[func.name] = function() {
        return new Promise((resolve, reject) => {
          console.log(`executing function '${func.name}' with '${func.method}' call on contract with params ${util.inspect(arguments)}`);

          // callback for the function invoked
          var cb = (err, result) => {
            if (err) {
              console.error(`error executing function '${func.name}' on contract with params: ${util.inspect(arguments)}: ${err.message}`);
              return reject(err);
            }
            
            console.log(`function '${func.name}' on contract completed successfully`);

            if (func.method === 'call')
              console.log(`result: ${result.toString()}`);
            else
             console.log(`tx hash: ${result}`);
            
            return resolve(result);
          };

          // extract original params and add the callback to the list
          var params = Array.prototype.slice.call(arguments);
          params.push(cb);

          // invoke requested method on the contract
          // https://ethereum.stackexchange.com/questions/765/what-is-the-difference-between-a-transaction-and-a-call
          // TODO: in case of sendTransaction, we need to use Events to get the actual result after the transaction is mined
          // when using 'call' the result will be returned immediately. This is only for contant functions or such that do not change the state.
          return contractInstance[func.name][func.method].apply(contractInstance, params);
        });
      }
    })(func);

});

