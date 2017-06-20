'use strict';
// jshint camelcase: false

// modules
var bodyParser = require('body-parser'),
    express    = require('express'),
    http       = require('http'),
    isCF       = require('is-cf'),
    path       = require('path'),
    uuid       = require('uuid'),
// internal requires
    lib        = require('./lib');

var app = express();

var apiVersion = process.env.API_VERSION || 0,
    appId = '',
    appName = '',
    colour = '',
    instanceAddress = '',
    instanceId = '',
    instanceIndex = '',
    redisEnabled = false,
    registerer = '',
    versionPrefix = '';

if (apiVersion !== 0) {
  versionPrefix = '/v' + apiVersion;
}

// globals
app.set('apiVersion', apiVersion);
app.set('port', process.env.PORT || 3000);
app.set('json spaces', 2);

// attach vcap data to app var
if (isCF.env()) {

  var vcap = {},
      vcapEnv = JSON.parse(process.env.VCAP_APPLICATION);

  vcap.applicationName = vcapEnv.application_name;
  vcap.applicationId = vcapEnv.application_id;
  vcap.hostAddress = process.env.CF_INSTANCE_ADDR;
  vcap.instanceId = vcapEnv.instance_id;
  vcap.instanceIndex = vcapEnv.instance_index;

  appName = vcap.applicationName;
  appId = vcap.applicationId;
  instanceAddress = vcap.hostAddress;
  instanceId = vcap.instanceId;
  instanceIndex = vcap.instanceIndex;
  redisEnabled = isCF.getServiceInstance(process.env.REDIS_PROVIDER, process.env.REDIS_INSTANCE_NAME) ? true : false;
  colour = process.env.COLOUR;

  app.set('vcap', vcap);

} else {

  appName = 'cf-demo-node';
  appId = uuid();
  instanceId = appId;
  instanceIndex = 0;
  colour = 'e44332';

}

// set these on app for use within routes
app.set('applicationName', appName);
app.set('applicationId', appId);
app.set('instanceAddress', instanceAddress);
app.set('instanceId', instanceId);
app.set('instanceIndex', instanceIndex);
app.set('redisEnabled', redisEnabled);
app.set('colour', colour);

// express variables
app.enable('trust proxy');
// custom powered by
app.use(function(req, res, next) {
  res.setHeader('X-Powered-By','PCFS');
  next();
});

// middleware

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// mount static page on versioned path if it exists
if (versionPrefix) {
  app.use(versionPrefix, express.static(path.join(__dirname, 'public')));
} else {
  app.use(express.static(path.join(__dirname, 'public')));
}

// routes
// regex is to handle versionPrefix if present
app.route(/(\/v\d+)?\/clean/)
  .get(
    lib.routes.get.clean
  );

app.route(/(\/v\d+)?\/info/)
  .get(
    lib.routes.get.info
  );

app.route(/(\/v\d+)?\/kill/)
  .get(
    lib.routes.get.kill
  );

// catch all handler
app.route('*')
  .all(function(req, res) {
    var data = {};

    data.message = 'nope. nothing. nada. zip. zilch.';
    res.status(404).json(data);
  });

// gracefully handle cf scale down
process.on('SIGTERM', function() {
  lib.service.unregister(appId, instanceId, instanceIndex, function(err, result) {
    if (err) throw err;
    console.log('gracefully exiting due to SIGTERM');
    process.exit(0);
  });
});

// go go go!
http.createServer(app).listen(app.get('port'), function(){
  lib.service.register(appId, instanceId, instanceIndex, function(err, result) {
    if (err) throw err;
    console.log('Express server listening on port ' + app.get('port'));
    // if redis is enabled, re-register every second hereafter
    if (redisEnabled) {
      registerer = setInterval(function(){
        lib.service.register(appId, instanceId, instanceIndex, function(err, result) {
          if (err) console.log('error re-registering instance ' + instanceId);
        });
      }, 1000);
    }
  });
});



module.exports = app; // for testing
