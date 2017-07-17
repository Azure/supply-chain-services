/*
 * Please refer to the dev.sample.json file.
 * Copy this file and create a new file named "dev.private.json".
*/

var nconf = require('nconf');
var path = require('path');

var envFile = '';
if (process.env.NODE_ENV == 'production') { 
  envFile = path.join(__dirname, 'prod.private.json');
} else {
  envFile = path.join(__dirname, 'dev.private.json');
}
console.log(`using env file: ${envFile}`);

var nconfig = nconf.env().file({ file: envFile });


// centric place to read and parse all configuration values
var config = {
  CONTRACT_ADDRESS: nconfig.get('CONTRACT_ADDRESS'),
  ACCOUNT_ADDRESS: nconfig.get('ACCOUNT_ADDRESS'),
  GET_RPC_ENDPOINT: nconfig.get('GET_RPC_ENDPOINT'),
  GET_RPC_PRIVATE_ENDPOINT: nconfig.get('GET_RPC_PRIVATE_ENDPOINT'),
  AZURE_STORAGE_CONNECTION_STRING: nconfig.get('AZURE_STORAGE_CONNECTION_STRING')
}

config.GAS = nconfig.get('GAS');
if (typeof config.GAS === 'string') {
  config.GAS = parseInt(config.gas);
}
if (typeof config.GAS !== 'number') {
  // if not exists, use default value
  config.GAS = 2000000;
}


// validate configuration
[
  'CONTRACT_ADDRESS',
  'ACCOUNT_ADDRESS',
  'GET_RPC_ENDPOINT',
  'GET_RPC_PRIVATE_ENDPOINT',
  'AZURE_STORAGE_CONNECTION_STRING',
  'GAS'
].forEach(param => validate(param));


function validate(param) {
  if (!config[param]) {
    console.error(`EXISTING PROCESS: configuration param missing: '${param}'`);
    process.nextTick(() => process.exit(1));
  }
}


config.nconfig = nconf;

module.exports = config;