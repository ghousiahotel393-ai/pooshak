import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanStorePhone } from '../src/lib/services/phoneSanitizer.ts';

test('cleanStorePhone cleans trailing .0 and restores leading 0', () => {
  assert.equal(cleanStorePhone('3241445512.0'), '03241445512');
  assert.equal(cleanStorePhone('3224444692.0'), '03224444692');
  assert.equal(cleanStorePhone('3224444692'), '03224444692');
  assert.equal(cleanStorePhone('03021234567'), '03021234567');
  assert.equal(cleanStorePhone('+923224444692'), '+923224444692');
  assert.equal(cleanStorePhone('03224444692.0'), '03224444692');
  assert.equal(cleanStorePhone(null), '');
  assert.equal(cleanStorePhone(undefined), '');
  assert.equal(cleanStorePhone(''), '');
});
