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
                        fulfill(entity.PublicKey._);
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
   return new nodeRSA({b: 512}); 
}

var entGen = azure.TableUtilities.entityGenerator;

module.exports = {
    getPublicKey: function (userId, keyId, next) {
        ReadEntity(keyTableName, userId, keyId).then(function (res) {
            next({
                key_id: res.RowKey._,
                public_key: res.PublicKey._
            });
        },
        function (err) { next(err); });
    },
    createKey: function(userId, keyId, next) {
        let key = generateNewKey();
        var entity = {
            PartitionKey: entGen.String(userId),
            RowKey: entGen.String(keyId),
            PublicKey: entGen.String(key.exportKey('pkcs1-public-pem')),
            PrivateKey: entGen.String(key.exportKey('pkcs1-private-pem')),
        };
        WriteEntity(keyTableName, entity).then(
            function (res) { next(res); },
            function (err) { next(err); }
        );

    },
    createKeyIfNotExist: function(userId, keyId, next){
        module.exports.getPublicKey(userId, keyId, function(result){
            if (!result.key_id){
                module.exports.createKey(userId, keyId, function(result){
                    next(result)
                });
            }
            else {
                next(result.public_key)
            }
        });
    },
    encrypt: function(publicKey, content){
        var rsa = new nodeRSA({b: 512}); 
        rsa.importKey(publicKey, 'pkcs1-public-pem');
        return rsa.encrypt(content, 'base64', 'string');
    },
    decrypt: function(userId, keyId, content, next){
        var rsa = new nodeRSA(); 
        ReadEntity(keyTableName, userId, keyId).then(function (res) {
            rsa.importKey(res.PrivateKey._, 'pkcs1-private-pem');
            next(rsa.decrypt(content).toString('UTF8'));
        },
        function (err) { next(content); });
    }
}
