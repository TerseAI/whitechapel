import type express from 'express';
import { z } from 'zod';

export const handleRequestError: express.ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (res.headersSent) {
    res.end();
    return;
  }
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'This request is incomplete. Check your invitation and try again.' });
    return;
  }
  const message = err instanceof Error ? err.message : 'The investigation service is unavailable.';
  const expected =
    /session is not valid|places are taken|case was not found|case is single-player|Unknown character|topic is not available/.test(message);
  if (!expected) console.error('Request failed:', message);
  res
    .status(expected ? 409 : 503)
    .json({
      error: expected
        ? message.replace(/^.*?(Your investigator|Both investigator|That case|Unknown character|That topic)/, '$1')
        : 'The case could not be reached. Check that the actor server is running, then reconnect.',
    });
};
