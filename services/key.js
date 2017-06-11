'use strict';
var nconf = require('nconf'),
    azure = require('azure-storage'),
    nodeRSA = require('node-rsa');

nconf.argv()
   .env()
   .file({ file: 'config.json' });

const storageConnectionString = nconf.get('AZURE_STORAGE_CONNECTION_STRING');
const tableSvc = azure.createTableService(storageConnectionString);
const keyTableName = 'Keys';

function WriteEntity(tableName, entity) {
    return new Promise(function (fulfill, reject) {
        tableSvc.createTableIfNotExists(tableName, function (error, result, response) {
            if (!error) {
                tableSvc.insertEntity(tableName, entity, function (error, result, response) {
                    if (!error) {
                        fulfill(entity.Key._);
                    }
                    else {
                        reject(error);
                    }
                });
            }
            else {
                console.error(error);
            }
        });
    });
}

function ReadEntity(tableName, partitionKey, rowKey) {
    return new Promise(function (fulfill, reject) {
        tableSvc.retrieveEntity(tableName, partitionKey, rowKey, function (error, result, response) {
            if (!error) {
                fulfill(result);
            }
            else {
                reject(error);
            }
        });
    });
}

function generateNewKey(){
   var key = new nodeRSA({b: 512}); 
   return key.exportKey('pkcs1-public-pem');
}

var entGen = azure.TableUtilities.entityGenerator;

module.exports = {
    getKey: function (userId, keyId, next) {
        ReadEntity(keyTableName, userId, keyId).then(function (res) {
            next({
                key_id: res.RowKey._,
                key: res.Key._
            });
        },
        function (err) { next(err); });
    },
    createKey: function(userId, keyId, next) {
        var entity = {
            PartitionKey: entGen.String(userId),
            RowKey: entGen.String(keyId),
            Key: entGen.String(generateNewKey())
        };
        WriteEntity(keyTableName, entity).then(
            function (res) { next(res); },
            function (err) { next(err); }
        );

    }
}
