import test from 'node:test';
import assert from 'node:assert/strict';
import { josa } from '../js/text.js';

test('조사: 받침에 따라 고른다', () => {
  assert.equal(josa('하이원', '을', '를'), '하이원을');
  assert.equal(josa('무주덕유산', '을', '를'), '무주덕유산을');
  assert.equal(josa('휘닉스파크', '을', '를'), '휘닉스파크를');
  assert.equal(josa('오크밸리', '을', '를'), '오크밸리를');
  assert.equal(josa('High1', '을', '를'), 'High1을(를)');
});
