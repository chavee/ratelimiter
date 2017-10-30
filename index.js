var util = require('util'),
    fs = require('fs'),
    log = require('levenlabs-log'),
    path = require('path'),
    luaScript = fs.readFileSync(path.join(__dirname, './lua/rollinglimit.lua'), 'utf8');

function RollingLimit(options) {
    if (typeof options !== 'object' || options === null) {
        throw new TypeError('options must be an object');
    }
    if (typeof options.interval !== 'number') {
        throw new TypeError('interval must be a number');
    }
    if (typeof options.limit !== 'number') {
        throw new TypeError('limit must be a number');
    }
    if (!options.redis || typeof options.redis.defineCommand !== 'function') {
        throw new TypeError('redis must be an instance of ioredis client');
    }
    if (options.prefix && typeof options.prefix !== 'string') {
        throw new TypeError('prefix must be a string');
    }
    this.interval = options.interval;
    this.limit = options.limit;
    this.redis = options.redis;
    this.prefix = options.prefix || '';
    this.redis.defineCommand('rollingLimit', {
        numberOfKeys: 1,
        lua: luaScript
    });
}

RollingLimit.prototype.use = function(id, opt, callback) {
    var amount = 1;
    var nowMS = Date.now();
    var timeMS = nowMS; 
    var _this = this;

    if (typeof opt === 'function' || opt == null) {
        callback = opt;
        opt = null;
    }
    if (callback && typeof callback !== 'function') {
        throw new TypeError('callback must be a function');
    }

    if (opt) {
        if (opt.amount || opt.amount==0) {
            amount = opt.amount;
        }

        if (opt.time) {
            timeMS = opt.time;
        }
    }

    log.debug('rollinglimit: use called', {id: id, amount: amount});
    return new Promise(function(resolve, reject) {
        _this.redis.rollingLimit(_this.prefix + id, _this.limit, _this.interval, timeMS, nowMS, amount, function(err, res) {
            if (err) {
                log.error('rollinglimit: error calling lua', {
                    id: id,
                    error: err
                });
                reject(err);
                if (callback) {
                    callback(500, 0, 0);
                }
                return;
            }
            log.debug('rollinglimit: use success', {
                id: id,
                result: res
            });
            resolve(res);
            if (callback) {
                callback(res[0]||0, res[1]||0, res[]);
            }
            return;
        });
    });
};

RollingLimit.prototype.fill = function(id, callback) {
    if (callback && typeof callback !== 'function') {
        throw new TypeError('callback must be a function');
    }
    log.debug('rollinglimit: fill called', {id: id});
    return new Promise(function(resolve, reject) {
        this.redis.zremrangebyrank(this.prefix + id, 0, -1, function(err, res) {
            if (err) {
                log.error('rollinglimit: error calling zremrangebyrank', {
                    id: id,
                    error: err
                });
                reject(err);
            } else {
                log.debug('rollinglimit: fill success', {
                    id: id,
                    result: res
                });
                resolve();
            }
            if (callback) {
                callback(err);
            }
        });
    }.bind(this));
};

module.exports = RollingLimit;
