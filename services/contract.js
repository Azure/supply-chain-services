'use strict';

var Web3 = require('web3');
var web3 = new Web3();
var util = require('util');
var abi = require('./ProofOfProduceQuality').abi;
var config = require('../config');
var utils = require('../utils');

var callAsyncFunc = utils.callAsyncFunc;

web3.setProvider(new Web3.providers.HttpProvider(config.GET_RPC_ENDPOINT));
var contractInstance = web3.eth.contract(abi).at(config.CONTRACT_ADDRESS);

// register event listeners
var events = abi
  .filter(node => node.type === 'event')
  .forEach(event => {
    console.log(`registering to event: ${event.name}`);
    contractInstance[event.name]((err, result) => {
      if (err) return console.error(`error in event listener '${event.name}': ${err.message}`);
      console.log(`got event result for '${event.name}': ${util.inspect(result)}`);
    });
});

// genertic function to unlock the account before invoking a 
// 'sendTransaction' type call on the contract, and then lock the account  
async function callSendTransactionApi(asyncFunc, config) {
  try {

      if (!utils.isTestRpc) {
        var unlockRes = await callAsyncFunc(web3.personal, 'unlockAccount', config.from, config.password);
        if (!unlockRes.result) {
          throw new Error(`error unlocking account: ${config.from}`);
        }
      }
    
      // get balance
      var balanceRes = await callAsyncFunc(web3.eth, 'getBalance', config.from);
      var balanceInWei = balanceRes.result;
 
      // call the actual function
      var funcResult = await asyncFunc(balanceInWei);
      
      if (!utils.isTestRpc) {
        var lockRes = await callAsyncFunc(web3.personal, 'lockAccount', config.from, config.password);
        if (!lockRes) {
          throw new Error(`error locking account: ${config.from}`);
        }
      }

    }
    catch(err) {
      console.error(`error storing proof in blockchain: ${err.message}`);
      throw err;
    }

    return funcResult;
}

// store proof
async function storeProof(opts) {

  var apiRequest = await callSendTransactionApi(async balanceInWei => {
   
    // find out the cost for this api call
    var apiPrice = await callAsyncFunc(contractInstance.storeProof, 'estimateGas', opts.trackingId, opts.previousTrackinId, opts.encryptedProof, opts.publicProof, opts.config);
    var priceInWei = apiPrice.result;
    console.log(`got estimated gas price: ${priceInWei}`);

    // check that we have enough balance
    if (balanceInWei.lessThan(priceInWei)) {
      throw new Error(`current balance (${balanceInWei} wei) is lower than the estimate cost for the request (${priceInWei} wei). stopping request`);
    }

    opts.config.gas = priceInWei;
    return await callAsyncFunc(contractInstance.storeProof, 'sendTransaction', opts.trackingId, opts.previousTrackinId, opts.encryptedProof, opts.publicProof, opts.config);
  }, opts.config);

  return { txHash: apiRequest.result };

}

// transfer proof ownership
async function transfer(opts) {

  var apiRequest = await callSendTransactionApi(async balanceInWei => {

    var apiPrice = await callAsyncFunc(contractInstance.transfer, 'estimateGas', opts.trackingId, opts.transferTo,  opts.config);
    var priceInWei = apiPrice.result;
    console.log(`got estimated gas price: ${priceInWei}`);

    // check that we have enough balance
    if (balanceInWei.lessThan(priceInWei)) {
      throw new Error(`current balance (${balanceInWei} wei) is lower than the estimate cost for the request (${priceInWei} wei). stopping request`);
    }

    opts.config.gas = priceInWei;
    return await callAsyncFunc(contractInstance.transfer, 'sendTransaction', opts.trackingId, opts.transferTo,  opts.config);
  }, opts.config);

  return { txHash: apiRequest.result };
}

// gets a proof
async function getProof(trackingId) {
  try {
    var getProofRequest = await callAsyncFunc(contractInstance.getProof, 'call', trackingId);
  }
  catch(err) {
    console.error(`error getting proof from blockchain: ${err.message}`);
    throw err;
  }

  var res = getProofRequest.result;

  res = {
    owner: res[0],
    encryptedProof: res[1],
    publicProof: res[2],
    previousTrackingId: res[3]
  };

  // proof does not exist
  if (!res.encryptedProof) {
    return null;
  }

  return res;
}

module.exports = {
  getProof,
  storeProof,
  transfer
};