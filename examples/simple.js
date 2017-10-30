#!/usr/bin/env node

var RateLimiter = require('../index.js');
var redis = require('ioredis');
var client = redis.createClient({
  port: 6379,
  host: '127.0.0.1'
});

limiter = new RateLimiter({
  limit : 4,
  interval : 60000,
  redis : client,
  prefix : 'APIServer'

});

client.on('ready', function() {
    for (var i=0; i<5; i++) {
      limiter.use('deer', function(err, numleft, timetowait) {
        console.log('status: '+err+', numleft: '+numleft+', timetowait: '+timetowait);
      });
    }
});
