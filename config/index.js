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

var config = nconf.env().file({ file: envFile });

module.exports = config;