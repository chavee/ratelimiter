# ratelimiter #

A rolling rate limit using Redis forked from https://github.com/fastest963/node-redis-rolling-limit to support custom timestamp with fine-grained status codes and timeToWait returned.

### Usage ###

```JS
var RateLimiter = require('ratelimiter');
```

## RateLimiter Methods ##

### limiter = new RateLimiter(options) ###

Creates a new RateLimiter instance.

Options:
* `limit`: (required) maximum of allowed uses in `interval`
* `interval`: (required) millisecond duration for the `limit`
* `redis`: (required) an instance of [RedisClient](https://www.npmjs.com/package/redis)
* `prefix`: (optional) a string to prepend before `id` for each key

### limiter.use(id, callback) ###
### limiter.use(id, option, callback) ###

limiter.use() takes a token from the limit's bucket for `id` with optional `option` and calls `callback` when finished.

`option` is the object with the following optional fields
*  `amount` : the number of tokens to take from the bucket and defaults to `1`. If you wanted
to get the count of tokens left, send in an `amount` of `0`.
* `time` : the timestamp associated with the api call which defaults to the current timestamp.

 The callback is called with arguments (error, numLeft, timeToWait). Possible values of `error` are as follow
* 0 : OK
* 429 : Rate limit exceeded
* 451 : Illegal backdate timestamp
* 500 : Internal error

`numLeft` is the number of tokens left in the bucket.
`timeToWait` is the millisecond util next call is allowed.

Returns a promise that can be used instead of the callback.

### limiter.fill(id, callback) ###

Re-fills the bucket for `id` in redis to max capacity. `callback` is called with (error). Returns a promise that can be used instead of the callback.


Simple usage
```JS
var RateLimiter = require('ratelimiter');
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

```

More advance usage - to override calling timestamps
```JS
var RateLimiter = require('ratelimiter');
var redis = require('ioredis');
var async = require('async');

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


client.on('ready', function() {
    limiter.fill('deer', function() {
        
        var timeline = [1000,2500,3500,4000,5000,6000,7000,9000];
        
        async.eachSeries(timeline, function(time, callback) {
            limiter.use('deer', {amount: 1, time: time}, function(err, numleft, timetowait) {
                console.log('time: '+time+' --> status: '+err+', numleft: '+numleft+', timetowait: '+timetowait);
                callback(null);
            });
        }, function(err) {

        });
    });
});

```
