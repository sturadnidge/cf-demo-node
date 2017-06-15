'use strict';

var debug = require('debug')('service'),
    isCF  = require('is-cf'),
    redis = require('redis');

// debug to STDOUT, not STDERR
debug.log = console.log.bind(console);

var client = false,
    redisProvider = process.env.REDIS_PROVIDER,
    redisServiceInstance = process.env.REDIS_INSTANCE_NAME;

if (isCF.getService(redisProvider)) {

  var svc = isCF.getServiceInstance(redisProvider, redisServiceInstance);

  if (svc) {
    // this works for rediscloud on PWS, not sure if p-redis has the same structure
    var creds = svc.credentials;
    // node-redis wants a 'host' field, but rediscloud gives us a 'hostname'
    creds.host = creds.hostname;
    delete creds.hostname;

    client = redis.createClient(creds);
  }

}

module.exports = {

  clean: function(appId, callback) {
    debug('cleaning applicationId: ' + appId);

    if (client) {
      var query = appId + ':*';
      // it's a demo... will never be more than 100 instances!
      client.SCAN(0, 'MATCH', query, 'COUNT', '100', function(err, results) {
        // results is [cursor, [key,key,...]]
        results[1].forEach(function(key) {
          debug('deleting key ' + key);
          client.DEL(key);
        });
        callback(null, '1');
      });
    } else {
      callback(null, '1');
    }

  },

  query: function(appId, callback) {
    debug('querying applicationId: ' + appId);

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
    debug('registering instance: ' + key);

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
    debug('unregistering instance: ' + key);

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
