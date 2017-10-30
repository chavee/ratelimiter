# ratelimiter #

A rolling rate limit using Redis forked from https://github.com/fastest963/node-redis-rolling-limit. 

### Usage ###

```JS
var RateLimiter = require('ratelimiter');
```

## RollingLimit Methods ##

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
* 400 : Rate limit exceeded
* 500 : Illegal backdate update

`numLeft` is the number of tokens left in the bucket.
`timeToWait` is the millisecond util next call is allowed.

Returns a promise that can be used instead of the callback.

### limiter.fill(id, callback) ###

Re-fills the bucket for `id` in redis to max capacity. `callback` is called with (error). Returns a promise that can be used instead of the callback.
