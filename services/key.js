'use strict';

var util = require('util');
var azure = require('azure-storage');
var nodeRSA = require('node-rsa');
var config = require('../config');

const tableSvc = azure.createTableService(config.AZURE_STORAGE_CONNECTION_STRING);
const keyTableName = 'Keys';

function writeEntity(tableName, entity) {
  return new Promise(function (resolve, reject) {
    return tableSvc.createTableIfNotExists(tableName, function (err, result, response) {
      if (err) {
        console.error(`error in createTableIfNotExists with ${util.inspect(arguments)}: ${tableName}`);
        return reject(err);
      }
      return tableSvc.insertEntity(tableName, entity, function (err, result, response) {
        if (err) {
          console.error(`error in insertEntity with ${util.inspect(arguments)}: ${tableName} ${util.inspect(entity)}`);
          return reject(err);
        }
        return resolve(entity.PublicKey._);
      });
    });
  });
}

function readEntity(tableName, partitionKey, rowKey) {
  return new Promise(function (resolve, reject) {
    return tableSvc.retrieveEntity(tableName, partitionKey, rowKey, function (err, result, response) {
      if (err) {
        // if entity does not exists it's not an error, resolve
        if (err.statusCode === 404) return resolve();

        console.error(`error in readEntity with ${util.inspect(arguments)}: ${util.inspect(err)}`);
        return reject(err);
      }
      return resolve(result);
    });
  });
}

function generateNewKey(){
   return new nodeRSA({b: 512}); 
}

var entGen = azure.TableUtilities.entityGenerator;

function encrypt(publicKey, content) {
  var rsa = new nodeRSA(); 
  rsa.importKey(publicKey, 'pkcs1-public-pem');
  return rsa.encrypt(content, 'base64', 'UTF8');
}

async function decrypt(userId, keyId, content) {
  var rsa = new nodeRSA(); 
  var res = await readEntity(keyTableName, userId, keyId);

  rsa.importKey(res.PrivateKey._, 'pkcs1-private-pem');
  try {
    var decyrptedContent = rsa.decrypt(content, 'UTF8');
    return decyrptedContent;
  }
  catch(err) {
    console.error(`error: ${err.message}`);
    // TODO: check with Beat- do we want to throw here or should we return the content not decrypted?
  }
  return content;
}

async function getPublicKey(userId, keyId) {
  var res = await readEntity(keyTableName, userId, keyId);
  if (!res) return null;

  return {
    key_id: res.RowKey._,
    public_key: res.PublicKey._
  }
}

async function createKey(userId, keyId) {
  var key = generateNewKey();

  var entity = {
    PartitionKey: entGen.String(userId),
    RowKey: entGen.String(keyId),
    PublicKey: entGen.String(key.exportKey('pkcs1-public-pem')),
    PrivateKey: entGen.String(key.exportKey('pkcs1-private-pem')),
  };

  var res = await writeEntity(keyTableName, entity);
  return res;
}     

async function createKeyIfNotExist(userId, keyId) { 

  try {
    var result = await getPublicKey(userId, keyId);
  }
  catch(err) {
    console.error(`error getting public key: ${util.inspect(err)}`);
    throw err;
  }
  if (!result || !result.key_id) {

    result = await createKey(userId, keyId);
    return result;
  }
  
  return result.public_key;
 }


module.exports = {
  getPublicKey,
  createKey,
  createKeyIfNotExist,
  encrypt,
  decrypt
}
