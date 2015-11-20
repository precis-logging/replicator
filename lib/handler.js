var utils = require('precis-utils');
var defaults = utils.defaults;

var noop = function(){};
const DEFAULT_LOGGER = {
  info(){
    console.log.apply(console, arguments);
  },
  error(){
    console.error.apply(console, arguments);
  }
};

var Handler = function(options){
  var {Bus, sockets} = options;
  this.options = options;
  this.batchSize = options.batchSize || 1;
  this.buffer = new Array(this.batchSize);
  this.sp = 0;
  this.destination = options.bus;

  var logger = this.logger = options.logger;
  logger.info(options.source);
  logger.info('Replicator:', 'Attaching to message bus '+options.source.connectionString);
  this.source = new Bus(defaults({logger, prefix: 'Replicator:'}, options.source));
  this.gotFirstMessage = false;
  this.source.on('started', function(info){
    logger.info('Replicator:', 'Attached to message bus '+options.source.connectionString);
    sockets.emit('replicator::status', 'waiting');
  });
  this.source.on('event', (data)=>{
    if(data.op !== 'i'){
      return;
    }
    if(!this.gotFirstMessage){
      logger.info('Replicator: ', 'Got first message to forward');
      sockets.emit('replicator::status', 'tailing');
      this.gotFirstMessage = true;
    }
    this.push(data);
  });
  this.source.on('error', function(error){
    logger.error('Replicator:', error);
    sockets.emit('replicator::error', error);
  });
  this.source.on('stopped', function(){
    this.gotFirstMessage = false;
    logger.info('Replicator: ', 'Detached from message bus.'+options.source.connectionString);
    sockets.emit('replicator::status', 'stopped');
  });
  sockets.emit('replicator::status', 'starting');
  this.source.start();
};

Handler.prototype.sendBuffer = function(){
  var records = this.buffer;
  var count = this.sp;
  this.buffer = new Array(this.batchSize);
  this.sp = 0;
  this.destination.write(records, (err)=>{
    if(err){
      return this.options.logger.error('Replicator:', err);
    }
    this.logger.debug('Replicator wrote: ', count+' records');
  });
};

Handler.prototype.push = function(record){
  this.buffer[this.sp] = record.o || record;
  this.sp++;
  if(this.sendTimer){
    clearTimeout(this.sendTimer);
  }
  this.sendTimer = setTimeout(()=>{
    this.sendTimer = false;
    this.sendBuffer();
  }, 100);
  if(this.sp>=this.batchSize){
    setImmediate(()=>this.sendBuffer());
  }
};

module.exports = {Handler};
