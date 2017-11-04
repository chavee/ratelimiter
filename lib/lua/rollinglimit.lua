-- key limit intervalMS timeMS [amount]
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local intervalMS = tonumber(ARGV[2])
local timeMS = tonumber(ARGV[3])
local nowMS = tonumber(ARGV[4])

local timeToWait = 0
local amount = 1

if ARGV[5] then
    amount = math.max(tonumber(ARGV[5]), 0)
end

local minrts = redis.call('ZRANGE', key, 0, 0, "WITHSCORES")
if (minrts[2] and minrts[2] - intervalMS > timeMS) then
    return {451,0,timeToWait}
end

redis.call('ZREMRANGEBYSCORE', key, '-inf', timeMS - intervalMS)
local num = redis.call('ZCARD', key)

local numleft = limit - num - amount
if numleft <= 0 then
    minrts = redis.call('ZRANGE', key, 0, 0, "WITHSCORES")
    if minrts[2] then
        timeToWait = minrts[2]-timeMS+intervalMS
    else
        timeToWait = intervalMS
    end

    if numleft < 0 then
        return {429,numleft+amount,timeToWait}
    end
end

if amount > 0 then
    local args = {'ZADD', key}
    for i = 1, amount do
        args[(i * 2) + 1] = timeMS
        args[(i * 2) + 2] = string.format("%x%x%s", timeMS, num, i)
    end
    redis.call(unpack(args))
    -- only actually update expire if they added a new token
    redis.call('PEXPIRE', key, intervalMS)
end
return {0,numleft,timeToWait}
