var utils = require('precis-utils');
var isTrue = utils.isTrue;
var defaults = utils.defaults;
var Handler = require('./lib/handler').Handler;
var path = require('path');
var Joi = require('joi');

var routes = function(){
  var {logger, handler, sockets: io} = this;
  return [
    {
      path: '/api/v1/replicator/status',
      method: 'GET',
      config: {
        tags: ['api'],
        handler: function(req, reply){
          if(handler.source.tailing){
            if(!handler.gotFirstMessage){
              return reply('waiting');
            }
            return reply('tailing');
          }
          if(handler.source.started){
            return reply('started');
          }
          if(handler.source.starting){
            return reply('starting');
          }
          return reply('stopped');
        }
      }
    },
    {
      path: '/api/v1/replicator/restarts',
      method: 'GET',
      config: {
        tags: ['api'],
        handler: function(req, reply){
          return reply(handler.restarts);
        }
      }
    },
    {
      path: '/api/v1/replicator/start',
      method: 'POST',
      config:{
        tags: ['api'],
        handler: function(req, reply){
          if(handler.source.tailing){
            if(!handler.gotFirstMessage){
              return reply('waiting');
            }
            return reply('tailing');
          }
          if(handler.source.started){
            return reply('started');
          }
          if(handler.source.starting){
            return reply('starting');
          }
          logger.info('Replicator Tailing Starting');
          handler.source.tail();
          io.emit('replicator::status', 'starting');
          return reply('starting');
        }
      }
    },
  ];
};

var registerUi = function(){
  return [
    {
      pages: [
      ],
    },
    {
      components: [
        {
          name: 'ReplicatorDashboard',
          filename: path.resolve(__dirname, 'ui/dashboard.jsx'),
        },
      ],
    },
    {
      stores: [
      ]
    },
  ];
};

var Plugin = function(options){
  this.options = options || {};
  var {sockets, logger} = options;
  this.sockets = sockets;
  this.logger = logger;
};

Plugin.prototype.init = function(options){
  var {bus, Bus, source} = options;
  var config = this.config = defaults({}, options);
  this.handler = new Handler(defaults({
    logger: this.logger,
    sockets: this.sockets,
    source: source,
    Bus: Bus,
    destination: bus,
  }, options));
};

Plugin.prototype.register = function(options){
  var register = options.register;
  register({
    proxy: options.proxy,
    ui: registerUi.call(this),
    server: routes.call(this)
  });
};

/*
NOTE: Normally you would push records to the message Handler
but in this case we don't want to do that since we are going
to be forwarding from one location to the bus.
Plugin.prototype.push = function(record){
  if(this.uiOnly){
    return;
  }
  if(!this.handler){
    return setImmediate(function(){
      this.push(record);
    }.bind(this));
  }
  this.handler.push(record);
};
*/

module.exports = Plugin;
