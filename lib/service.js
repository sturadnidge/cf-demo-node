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
      var query = appId + ':*';
      // it's a demo... will never be more than 100 instances!
      client.SCAN(0, 'MATCH', query, 'COUNT', '100', function(err, results) {
        // results is [cursor, [key,key,...]]
        results[1].forEach(function(key) {
          console.log('deleting key ' + key);
          client.DEL(key);
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
      var query = appId + ':*';
      // it's a demo... will never be more than 100 instances!
      client.SCAN(0, 'MATCH', query, 'COUNT', '100', function(err, results) {
        // results is [cursor, [key,key,...]]
        callback(err, orderInstances(results[1]));
      });
    } else {
      callback(null, []);
    }

  },

  register: function(appId, instanceId, index, callback) {

    var key = appId + ':' + instanceId + '/' + index;
    console.log('registering instance: ' + key);
    // register with redis if the service is bound
    if (client) {
      // expire keys after 3 seconds, clients will re-register every 1 second
      client.SET(key, '1', 'EX', '3', callback);
    } else {
      callback(null, 1);
    }

  },

  unregister: function(appId, instanceId, index, callback) {

    var key = appId + ':' + instanceId + '/' + index;
    console.log('unregistering instance: ' + key);
    if (client) {
      client.DEL(key, callback);
    } else {
      callback(null, 1);
    }

  }

};

// private

function orderInstances(arr) {
  var ordered = [];
  // item is appId:instanceId/index
  arr.forEach(function(item) {
    // strip off appId
    var instance = item.split(':')[1];
    // split out instanceId from index
    var parts = instance.split('/');
    // insert instanceId at index
    ordered.splice(parseInt(parts[1]), 0, parts[0]);
  });
  return ordered;
}
