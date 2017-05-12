'use strict';
/* jshint node: true, latedef: nofunc */

var _       = require('lodash'),
    request = require('request'),
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

      var data = {
        applicationName: req.app.get('applicationName'),
        applicationId: req.app.get('applicationId'),
        colour: req.app.get('colour'),
        instanceAddress: req.app.get('instanceAddress'),
        instanceId: req.app.get('instanceId'),
        instanceIndex: req.app.get('instanceIndex'),
        redis: req.app.get('redisEnabled')
      };

      service.query(req.app.get('applicationId'), function(err, results) {
        if (err) console.log('error querying service');
        // if an empty array is returned, we are either not using redis
        // or all keys have expired, so just push this instanceId into results
        if (_.isEmpty(results)) {
          results.push(data.instanceId);
        }
        data.instances = results;
        res.status(200).json(data);
      });

    },

    kill: function(req, res) {
      // implement a crude control to stop random people on the internet killing
      // the long-running demo app.
      if (!_.isNil(process.env.UNKILLABLE)) {
        console.log('received kill request, but we are UNKILLABLE');
        return res.redirect('/');
      }

      // if running mutiple instances, an incoming kill request could get
      // load balanced to anywhere, so need some logic to only kill ourselves
      var killId = req.query.index;

      if (killId == req.app.get('instanceIndex')) {

        console.log('received kill request for this instance ' + req.app.get('instanceId') + ' (index: ' + killId + ')');

        if (!_.isNil(req.query.hard)) {
          // hard kill, emulate real world crash
          process.exit(1);
        } else {
          // soft kill, clean up before dying
          service.unregister(req.app.get('applicationId'),
                             req.app.get('instanceId'),
                             req.app.get('instanceIndex'),
                             function(err, result) {
            if (err) console.log('error unregistering service');
            // redirect then die
            setTimeout(function(){ process.exit(1); }, 500);
            res.redirect('/');
          });
        }
      } else {
        console.log('kill request for index ' + killId + ' received by instance ' + req.app.get('instanceId') + ' (index: ' + req.app.get('instanceIndex') + ')');
        if (killId) {
          console.log('sending request with X-CF-APP-INSTANCE: ' + req.app.get("applicationId") + ":" + killId);

          var options = {
            url: req.protocol + '://' +req.hostname + '/killme',
            headers: {
              'X-CF-APP-INSTANCE': req.app.get('applicationId') + ':' + killId
            },
            qs: {
              'index': killId
            }
          }

          request(options, function(err, response, body) {
            console.log('sent X-CF-APP-INSTANCE request to index ' + killId);
            res.redirect('/');
          });

        } else {
          // we don't understand what killIndex is
          res.redirect('/');
        }
      }
    }

  }

};
