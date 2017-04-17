'use strict';
/* jshint node: true, latedef: nofunc */

var _       = require('lodash'),
    service = require('./service.js');

module.exports = {

  get: {

    clean: function(req, res) {

      var appId = req.app.get('applicationId'),
          instanceId = req.app.get('instanceId'),
          instanceIndex = req.app.get('instanceIndex');

      service.clean(appId, function(err, results) {
        if (err) console.log('error querying service');
        // redis clean, now register ourselves
        service.register(appId, instanceId, instanceIndex, function(err, result) {
          if (err) console.log('error registering service');
          res.redirect('/');
        });
      });

    },

    info: function(req, res) {

      var data = {};

      data.instanceAddress = req.app.get('instanceAddress');
      data.instanceId = req.app.get('instanceId');
      data.redis = req.app.get('redisEnabled');
      data.theme = process.env.THEME || 'gray';

      service.query(req.app.get('applicationId'), function(err, results) {
        if (err) console.log('error querying service');
        // if an empty array is returned, we are not using redis
        // therefore push this instanceId into results
        if (_.isEmpty(results)) {
          results.push(data.instanceId);
        }
        data.instances = results;
        res.status(200).json(data);
      });

    },

    kill: function(req, res) {

      // clean up before dying... yes it's cheating, but it's a DEMO
      console.log('received kill request - instanceId: ' + req.app.get('instanceId'));
      service.unregister(req.app.get('applicationId'),
                         req.app.get('instanceId'),
                         req.app.get('instanceIndex'),
                         function(err, result) {
        if (err) console.log('error unregistering service');
        // die anyway
        process.exit(1);
      });

    }

  }

};
