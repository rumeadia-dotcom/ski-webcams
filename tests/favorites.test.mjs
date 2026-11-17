import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFavorites, toggleFavorite, sortResorts } from '../js/favorites.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}
const throwing = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};
const R = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

test('즐겨찾기가 위로, 그룹 안 순서는 유지', () => {
  assert.deepEqual(sortResorts(R, ['c']).map((r) => r.id), ['c', 'a', 'b', 'd']);
  assert.deepEqual(sortResorts(R, ['d', 'b']).map((r) => r.id), ['b', 'd', 'a', 'c']);
  assert.deepEqual(sortResorts(R, []).map((r) => r.id), ['a', 'b', 'c', 'd']);
});

test('정렬은 입력 배열을 바꾸지 않는다', () => {
  const copy = [...R];
  sortResorts(R, ['d']);
  assert.deepEqual(R, copy);
});

test('저장값이 없거나 깨졌으면 빈 목록', () => {
  assert.deepEqual(loadFavorites(memoryStorage()), []);
  assert.deepEqual(loadFavorites(memoryStorage({ 'ski.favorites': '{oops' })), []);
  assert.deepEqual(loadFavorites(memoryStorage({ 'ski.favorites': '123' })), []);
  assert.deepEqual(loadFavorites(memoryStorage({ 'ski.favorites': '[1,"a",null]' })), ['a']);
  assert.deepEqual(loadFavorites(throwing), []);
  assert.deepEqual(loadFavorites(undefined), []);
});

test('토글은 저장하고, 두 번이면 원상 복귀', () => {
  const s = memoryStorage();
  assert.deepEqual(toggleFavorite(s, 'a'), ['a']);
  assert.deepEqual(loadFavorites(s), ['a']);
  assert.deepEqual(toggleFavorite(s, 'b'), ['a', 'b']);
  assert.deepEqual(toggleFavorite(s, 'a'), ['b']);
  assert.deepEqual(loadFavorites(s), ['b']);
});

test('저장이 막혀 있어도 예외 없이 결과를 돌려준다', () => {
  assert.deepEqual(toggleFavorite(throwing, 'a', []), ['a']);
  assert.deepEqual(toggleFavorite(throwing, 'a', ['a', 'b']), ['b']);
});
