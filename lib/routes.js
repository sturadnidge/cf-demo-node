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

      data.applicationName = req.app.get('applicationName');
      data.applicationId = req.app.get('applicationId');
      data.instanceAddress = req.app.get('instanceAddress');
      data.instanceId = req.app.get('instanceId');
      data.instanceIndex = req.app.get('instanceIndex');
      data.redis = req.app.get('redisEnabled');
      data.theme = req.app.get('theme');

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
      // implement a crude control to stop random people on the internet killing
      // the long-running demo app. For convenience, don't require the env var
      // to be set - only disable killing if it's explicitly false.
      if (process.env.KILLABLE === 'false') {
        console.log('received kill request, but we are UNKILLABLE');
        return res.redirect('/');
      }

      // if running mutiple instances, an incoming kill request could get
      // load balanced to anywhere, so need some logic to only kill ourselves
      var killId = req.query.id;

      if (killId == req.app.get('instanceId')) {
        // clean up before dying... yes it's cheating, but it's a DEMO
        console.log('received kill request for this instance (id: ' + killId + ')');
        service.unregister(req.app.get('applicationId'),
                           req.app.get('instanceId'),
                           req.app.get('instanceIndex'),
                           function(err, result) {
          if (err) console.log('error unregistering service');
          // redirect then die
          setTimeout(function(){ process.exit(1); }, 500);
          res.redirect('/');
        });
      } else {
        console.log('received kill request for instance ' + killId);
        if (killId) {
          // bounce request, gorouter will eventually hit the desired instance
          // TODO make a request to same URI with the 'X-CF-APP-INSTANCE' header
          // set, so we don't bounce around gorouter
          res.redirect('/killme?id=' + killId);
        } else {
          // we don't understand what killIndex is
          res.redirect('/');
        }
      }
    }

  }

};
