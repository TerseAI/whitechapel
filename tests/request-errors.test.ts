import assert from 'node:assert/strict';
import { test } from 'node:test';
import type express from 'express';
import { handleRequestError } from '../backend/src/http/errors';
import { createCaseSchema } from '../backend/src/http/requests';

test('case creation validates an explicit mode and defaults to co-op', () => {
  assert.deepEqual(createCaseSchema.parse({}), { mode: 'co-op' });
  assert.deepEqual(createCaseSchema.parse({ mode: 'solo' }), { mode: 'solo' });
  assert.equal(createCaseSchema.safeParse({ mode: 'offline' }).success, false);
});

test('joining a solo case gives a useful conflict instead of a service failure', () => {
  let status: number | undefined, body: unknown;
  const response = { headersSent: false, status(value: number) { status = value; return this; }, json(value: unknown) { body = value; } };
  handleRequestError(new Error('Remote error: That case is single-player. Start your own case to play.'), {} as express.Request, response as express.Response, () => {});
  assert.equal(status, 409);
  assert.deepEqual(body, { error: 'That case is single-player. Start your own case to play.' });
});
