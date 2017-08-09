'use strict';

var util = require('util');
var azure = require('azure-storage');
var nodeRSA = require('node-rsa');
var config = require('../config');

const tableSvc = azure.createTableService(config.AZURE_STORAGE_CONNECTION_STRING);
const keyTableName = 'keys';

tableSvc.createTableIfNotExists(keyTableName, (err, result, response) => {
  if (err) {
    return console.error(`error creating table '${keyTableName}', error: ${err.message}`);
  }

  if (result.created) {
    return console.log(`table '${keyTableName}' created`);
  }
});

function writeEntity(tableName, entity) {

  if (entity.PartitionKey._ === decodeURIComponent(entity.PartitionKey._)) {
    entity.PartitionKey._ = encodeURIComponent(entity.PartitionKey._);
  }  
  
  if (entity.RowKey._ === decodeURIComponent(entity.RowKey._)) {
    entity.RowKey._ = encodeURIComponent(entity.RowKey._);
  }

  return new Promise((resolve, reject) => {
    return tableSvc.insertEntity(tableName, entity, (err, result, response) => {
      if (err) {
        console.error(`error in insertEntity with ${util.inspect(arguments)}: ${tableName} ${util.inspect(entity)}`);
        return reject(err);
      }
      console.log(`new key entity created: ${util.inspect(entity)}`);
      return resolve(entity);
    });
  });
}

function readEntity(tableName, partitionKey, rowKey) {
  
  if (partitionKey === decodeURIComponent(partitionKey)) {
    partitionKey = encodeURIComponent(partitionKey);
  }  
  
  if (rowKey === decodeURIComponent(rowKey)) {
    rowKey = encodeURIComponent(rowKey);
  }

  return new Promise((resolve, reject) => {
    return tableSvc.retrieveEntity(tableName, partitionKey, rowKey, (err, result, response) => {
      if (err) {
        if (err.statusCode === 404) {
          return resolve();
        }
        console.error(`error in readEntity with ${util.inspect(arguments)}: ${util.inspect(err)}`);
        return reject(err);
      }

      result.PartitionKey._ = decodeURIComponent(result.PartitionKey._);
      result.RowKey._ = decodeURIComponent(result.RowKey._);
      
      return resolve(result);
    });
  });
}

var entGen = azure.TableUtilities.entityGenerator;


async function encrypt(userId, keyId, content) {
  var rsa = new nodeRSA(); 
  var entity = await readEntity(keyTableName, userId, keyId);

  if (!entity) {
    // generate and store a new key
    var key = new nodeRSA({b: 512}); 

    var entity = {
      PartitionKey: entGen.String(userId),
      RowKey: entGen.String(keyId),
      PublicKey: entGen.String(key.exportKey('pkcs1-public-pem')),
      PrivateKey: entGen.String(key.exportKey('pkcs1-private-pem')),
    };

    entity = await writeEntity(keyTableName, entity);
  }

  rsa.importKey(entity.PublicKey._, 'pkcs1-public-pem');
  var encrypted = rsa.encrypt(content, 'base64', 'UTF8');
  return encrypted;
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
    console.error(`error decrypting content: ${err.message}`);
    throw err;
  }
  return content;
}


async function getPublicKey(userId, keyId) {
  var res = await readEntity(keyTableName, userId, keyId);
  if (!res) return null;

  return {
    keyId: res.RowKey._,
    publicKey: res.PublicKey._
  }
}


module.exports = {
  decrypt,
  encrypt,
  getPublicKey
}
