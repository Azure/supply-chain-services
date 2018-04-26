const util = require('util');
const express = require('express');
const HttpStatus = require('http-status-codes');
const validate = require('jsonschema').validate;
const schema = require('./schema');
const proof = require('../services/proof');
const bodyParser = require('body-parser');  


var app = express();

var usersApis;

app.get('/checkapis', async (req, res) => {
    var trackingId = req.headers['tracking-id'];
    var userId = req.headers['user-id'];
    
    // TODO: Get the proofs list according to this trackingId
    // TODO: Get the list of APIs according to this userId
    // TODO: Call the APIs one by one with the proofs
    // TODO: Combine the results to one result and return it.
)}

function readProperties(){
    // TODO: Read properties file and enter them to the global map (usersApis)
}

function getUserApisList(userId){
    // TODO: get the list of APIs for this user
}

