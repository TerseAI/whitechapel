import type express from 'express';

export function apiRateLimit(): express.RequestHandler {
  const rates = new Map<string, { since: number; count: number }>();
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    if (rates.size > 5000) for (const [k, v] of rates) if (now - v.since > 60_000) rates.delete(k);
    const rate = rates.get(key) ?? { since: now, count: 0 };
    if (now - rate.since > 60_000) {
      rate.since = now;
      rate.count = 0;
    }
    rate.count++;
    rates.set(key, rate);
    // Two investigators can each send ten movement updates per second.
    if (rate.count > 1800) {
      res.status(429).json({ error: 'Too many requests. Wait a minute and try again.' });
      return;
    }
    next();
  };
}
