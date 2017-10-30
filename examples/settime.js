#!/usr/bin/env node

var RateLimiter = require('../index.js');
var redis = require('ioredis');
var client = redis.createClient({
  port: 6379,
  host: '127.0.0.1'
});

limiter = new RateLimiter({
  limit : 3,
  interval : 6000,
  redis : client,
  prefix : 'APIServer'

});

var async = require('async');
var timeline = [1000,2500,3500,4000,5000,6000,7000,9000];

client.on('ready', function() {
    limiter.fill('deer', function() {
        async.eachSeries(timeline, function(time, callback) {
            limiter.use('deer', {amount: 1, time: time}, function(err, numleft, timetowait) {
                console.log('time: '+time+' --> status: '+err+', numleft: '+numleft+', timetowait: '+timetowait);
                callback(null);
            });
        }, function(err) {

        });
    });
});
