const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10분 캐시

// 캐시 미들웨어
const cacheMiddleware = (key, ttl = 600) => {
  return (req, res, next) => {
    const cacheKey = typeof key === 'function' ? key(req) : key;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // 원본 res.json을 저장
    const originalJson = res.json.bind(res);
    
    // res.json을 오버라이드하여 캐시 저장
    res.json = (data) => {
      if (res.statusCode === 200 && data.success) {
        cache.set(cacheKey, data, ttl);
      }
      return originalJson(data);
    };
    
    next();
  };
};

// 캐시 무효화
const invalidateCache = (pattern) => {
  const keys = cache.keys();
  keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.del(key);
    }
  });
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  cache
};