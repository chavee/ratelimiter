'use strict'

var RateLimiter = require('../lib/index.js');
var redis = require('ioredis');
var client = redis.createClient();
var async = require('async');

var limiter;
var SESSID = require('hat')(32)+'_';
    
function getOptionWithLimit(n) {
    return {
      limit : n,
      interval : 100,
      redis : client,
      prefix : SESSID
    }
}

describe("RateLimiter()", function() {
    var limiter;
    before(function(done) {
        limiter = new RateLimiter(getOptionWithLimit(2));
        done();
    });

    it("should return object", function() {
        expect(limiter).to.be.a('object').with.property('use');
        expect(limiter).to.be.a('object').with.property('fill');
    });
});

describe("limiter.use()", function() {
    var limiter;
    before(function(done) {
        limiter = new RateLimiter(getOptionWithLimit(2));
        done();
    });

    it("should return 0 as error with 0 timetowait when quota left", function(done) {
        limiter.use('TESTUSE', function(err, numleft, timetowait) {
            expect(err).to.equal(0);
            expect(numleft).to.not.equal(0);
            expect(timetowait).to.equal(0);
            done();
        });
    });

    it("should return 0 as error with non-zero timetowait when quota is used up", function(done) {
        limiter.use('TESTUSE', function(err, numleft, timetowait) {
            expect(err).to.equal(0);
            expect(numleft).to.equal(0);
            expect(timetowait).to.not.equal(0);
            done();
        });
    });

    it("should return 429 as error with non-zero timetowait when quota is exeeded", function(done) {
        limiter.use('TESTUSE', function(err, numleft, timetowait) {
            expect(err).to.equal(429);
            expect(numleft).to.equal(0);
            expect(timetowait).to.not.equal(0);
            done();
        });
    });

    it("shoud return quota after interval has passed", function(done) {
        limiter.use('TESTEXPIRE', function(err, numleft, timetowait) {
            expect(numleft).to.equal(1);
            setTimeout(function() {
                limiter.use('test12', {amount: 0}, function(err, numleft, timetowait) {
                    expect(numleft).to.equal(2);
                    done();
                });
            }, 100);
        });
    });
});

describe("limiter.fill()", function() {
    var limiter;
    before(function(done) {
        limiter = new RateLimiter(getOptionWithLimit(2));
        done();
    });

    it("should reset the quota", function(done) {
        limiter.use('TESTFILL', function(err, numleft, timetowait) {
            limiter.fill('TESTFILL', function() {
                limiter.use('TESTFILL', function(err, numleft, timetowait) {
                    expect(err).to.equal(0);
                    expect(numleft).to.equal(1);
                    expect(timetowait).to.equal(0);
                    done();
                });
            });
        });
    });
});

describe("limiter.use() with mutiple IDs", function() {
    var limiter;
    before(function(done) {
        limiter = new RateLimiter(getOptionWithLimit(1));
        done();
    });

    it("should separate quota according to ID", function(done) {
        limiter.use('TESTID1', function(err, numleft, timetowait) {
            expect(err).to.equal(0);
            expect(numleft).to.equal(0);
            expect(timetowait).to.not.equal(0);

            limiter.use('TESTID2', function(err, numleft, timetowait) {
                expect(err).to.equal(0);
                expect(numleft).to.equal(0);
                expect(timetowait).to.not.equal(0);
                done();
            });
        });
    });
});

describe("limiter.use() with option", function() {
    var limiter1, limiter4;

    before(function(done) {
        limiter1 = new RateLimiter(getOptionWithLimit(1));
        limiter4 = new RateLimiter(getOptionWithLimit(4));
        done();
    });

    it("should take blank option the same as amount == 1", function(done) {
        limiter1.use('TESTOPT', {}, function(err, numleft, timetowait) {
            expect(err).to.equal(0);
            expect(timetowait).to.not.equal(0);

            limiter1.use('TESTOPT', {}, function(err, numleft, timetowait) {
                expect(err).to.equal(429);
                expect(numleft).to.equal(0);
                expect(timetowait).to.not.equal(0);
                done();
            });
        });
    });

    it("should take option with amount set to 1", function(done) {
        limiter1.use('TESTAMOUNT', {amount: 1}, function(err, numleft, timetowait) {
            expect(err).to.equal(0);
            expect(numleft).to.equal(0);
            expect(timetowait).to.not.equal(0);

            limiter1.use('TESTAMOUNT', {ampount: 1}, function(err, numleft, timetowait) {
                expect(err).to.equal(429);
                expect(numleft).to.equal(0);
                expect(timetowait).to.not.equal(0);
                done();
            });
        });
    });

    it("should take option with amount set to 0 and return the current numleft", function(done) {
        limiter4.fill('TESTAMOUNT', function() {
            limiter4.use('TESTAMOUNT', {amount: 0}, function(err, numleft, timetowait) {
                expect(err).to.equal(0);
                expect(numleft).to.equal(4);
                done();
            });
        });
    });


    it("should deduct from quota according to the amount value", function(done) {
        limiter4.fill('TESTAMOUNT', function() {
            limiter4.use('TESTAMOUNT', {amount: 2}, function(err, numleft, timetowait) {
                expect(err).to.equal(0);
                expect(numleft).to.equal(2);
                done();
            });
        });
    });

    it("should return 429 with the same numleft if amount exceeds numleft", function(done) {
        limiter4.use('TESTAMOUNT', {amount: 3}, function(err, numleft, timetowait) {
            expect(err).to.equal(429);
            expect(numleft).to.equal(2);
            done();
        });
    });

    it("should be always allow if amount == numleft", function(done) {
        limiter4.use('TESTAMOUNT', {amount: 2}, function(err, numleft, timetowait) {
            expect(err).to.equal(0);
            expect(numleft).to.equal(0);
            done();
        });
    });
});

describe("limiter.use() called succesively", function() {
    var limiter;
        before(function(done) {
            limiter = new RateLimiter(getOptionWithLimit(4));
            done();
        });

        it("should drain out the quota if called to the number of limit", function(done) {
            limiter.use('TESTDRAIN');
            limiter.use('TESTDRAIN');
            limiter.use('TESTDRAIN');
            limiter.use('TESTDRAIN', function(err, numleft, timetowait) {
                expect(err).to.equal(0);
                limiter.use('TESTDRAIN', function(err, numleft, timetowait) {
                    expect(err).to.equal(429);
                    done();
                });
            });

        });
});

describe("limiter.use() with custom timing", function() {
    var limiter;
    var timeline;
    before(function(done) {
        limiter = new RateLimiter(getOptionWithLimit(4));
        done();
    });
    
    it("should be used like a real time clock", function(done) {
        async.eachSeries([1,25,35,80,101,125], function(time, callback) {
            limiter.use('TESTCTIME', {amount: 1, time: time}, function(err, numleft, timetowait) {
                expect(err).to.equal(0);
                callback(null);
            });
        },
        function(err) {
            done();
        });
    });

    it("should return rate limit exceed if too fast than the limit allowed", function(done) {
        async.eachSeries([101,135,165,190, 201], function(time, callback) {
            limiter.use('TESTCTIMEFAST', {amount: 1, time: time}, function(err, numleft, timetowait) {
                expect(err).to.equal(0);
                callback(null);
            });
        },
        function(err) {
            limiter.use('TESTCTIMEFAST', {amount: 1, time: 224}, function(err, numleft, timetowait) {
                expect(err).to.equal(429);
                expect(timetowait).to.equal(135+100-224);
                done();
            });
        });
    });
});
