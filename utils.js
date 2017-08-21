
var util = require('util');

var nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
var isProd = nodeEnv === 'production';
var isTestRpc = nodeEnv === 'testrpc';

// a generic function to call async methods on an object
async function callAsyncFunc(obj, func) {
   return new Promise((resolve, reject) => {
    
    // callback for the function invoked
    var cb = (err, result) => {
      if (err) {
        console.error(`error executing function '${func}' with params: ${util.inspect(arguments)}: ${err.message}`);
        return reject(err);
      }
      
      console.log(`function '${func}' completed successfully with result: ${util.inspect(result)}`);
      return resolve({ result });
    };

    var params = Array.prototype.slice.call(arguments, 2);
    params.push(cb);

    return obj[func].apply(obj, params);
  });
}

// a generic sleep function
async function sleep(timeSecs) {
  return new Promise(resolve => setTimeout(() => resolve(), timeSecs * 1000));
}


var api = {
  callAsyncFunc,
  sleep
};

Object.defineProperty(api, 'isProd', { value: isProd });
Object.defineProperty(api, 'isTestRpc', { value: isTestRpc });

module.exports = api;
