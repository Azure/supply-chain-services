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
                        return fulfill(entity.PublicKey._);
                    }
                    else {
                        return reject(error);
                    }
                });
            }
            else {
               return reject(error);
            }
        });
    });
}

function ReadEntity(tableName, partitionKey, rowKey) {
    return new Promise(function (fulfill, reject) {
        tableSvc.retrieveEntity(tableName, partitionKey, rowKey, function (error, result, response) {
            if (!error) {
                return fulfill(result);
            }
            else {
                return reject(error);
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
            return next({
                key_id: res.RowKey._,
                public_key: res.PublicKey._
            });
        },
        function (err) { next(null); });
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
            function (res) { return next(res); },
            function (err) { return next(err); }
        );

    },
    createKeyIfNotExist: function(userId, keyId, next){
        module.exports.getPublicKey(userId, keyId, function(result){
            if (!result || !result.key_id){
                module.exports.createKey(userId, keyId, function(result){
                    return next(result)
                });
            }
            else {
                return next(result.public_key)
            }
        });
    },
    encrypt: function(publicKey, content){
        var rsa = new nodeRSA(); 
        rsa.importKey(publicKey, 'pkcs1-public-pem');
        return rsa.encrypt(content, 'base64', 'UTF8');
    },
    decrypt: function(userId, keyId, content, next){
        var rsa = new nodeRSA(); 
        ReadEntity(keyTableName, userId, keyId).then(function (res) {
            rsa.importKey(res.PrivateKey._, 'pkcs1-private-pem');
            try {
                var decyrptedContent = rsa.decrypt(content, 'UTF8');
                return next(decyrptedContent);
            }
            catch(ex){
                return next(content);
            }
        },
        function (err) { return next(content); });
    }
}
