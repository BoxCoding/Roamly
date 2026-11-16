// Fixed-window counters per key. shortcut: kept in memory per server instance (Cloud Run runs up to 3),
// so the effective limit is up to 3x; move to Redis or the database if abuse ever needs a hard global cap.
export function createLimiter({limit, windowMs, maxKeys = 50000}) {
  const hits = new Map();
  return function take(key, now = Date.now()) {
    let h = hits.get(key);
    if (!h || now - h.start >= windowMs) {
      if (hits.size >= maxKeys) hits.clear();
      h = {start: now, count: 0};
      hits.set(key, h);
    }
    h.count++;
    return {ok: h.count <= limit, retryAfter: Math.ceil((h.start + windowMs - now) / 1000)};
  };
}
