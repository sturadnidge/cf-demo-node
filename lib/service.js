'use strict';

var isCF  = require('is-cf'),
    redis = require('redis');

var client = false,
    serviceName = process.env.REDIS_SERVICE_NAME;

if (isCF.getService(serviceName)) {
  var svcs = isCF.getServicesEnv();
  // TODO: this works for rediscloud on PWS, not sure if p-redis has the same structure
  var creds = svcs[serviceName][0].credentials;

  creds.host = creds.hostname;

  delete creds.hostname;

  client = redis.createClient(creds);

}

module.exports = {

  clean: function(appId, callback) {
    console.log('cleaning applicationId: ' + appId);

    if (client) {

      client.SMEMBERS(appId, function(err, results) {
        results.forEach(function(item) {
          console.log('deleting item ' + item);
          client.SREM(appId, item);
        });
        callback(null, '1');
      });

    } else {
      callback(null, '1');
    }

  },

  query: function(appId, callback) {

    console.log('querying applicationId: ' + appId);

    if (client) {
      client.SMEMBERS(appId, function(err, results) {
      callback(err, orderInstances(results));
      });
    } else {
      callback(null, []);
    }

  },

  register: function(appId, instanceId, index, callback) {

    var indexedInstanceId = instanceId + '/' + index;
    console.log('registering instanceId: ' + indexedInstanceId);
    // register with redis if the service is bound
    if (client) {
      client.SADD(appId, indexedInstanceId, callback);
    } else {
      callback(null, 1);
    }

  },

  unregister: function(appId, instanceId, index, callback) {

    var indexedInstanceId = instanceId + '/' + index;
    console.log('unregistering instanceId ' + indexedInstanceId);
    if (client) {
      client.SREM(appId, indexedInstanceId, callback);
    } else {
      callback(null, 1);
    }

  }

};

// private

function orderInstances(arr) {
  var result = [];
  arr.forEach(function(item) {
    var parts = item.split('/');
    result.splice(parts[1], 0, parts[0]);
  });
  return result;
}
