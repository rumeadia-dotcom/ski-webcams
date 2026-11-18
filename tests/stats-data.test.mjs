import test from 'node:test';
import assert from 'node:assert/strict';
import { RANGES, buildBatchRequest, buildChannelRequest, parseDashboard, parseChannels, parseRealtime } from '../js/stats-data.js';

const resorts = [
  { id: 'yongpyong', name: '모나용평' },
  { id: 'konjiam', name: '곤지암' },
  { id: 'jisan', name: '지산포레스트' },
];
const row = (dims, metrics) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((value) => ({ value: String(value) })),
});

test('기간 선택지', () => {
  assert.deepEqual(RANGES.today.dateRange, { startDate: 'today', endDate: 'today' });
  assert.deepEqual(RANGES['7d'].dateRange, { startDate: '6daysAgo', endDate: 'today' });
  assert.deepEqual(RANGES['28d'].dateRange, { startDate: '27daysAgo', endDate: 'today' });
  assert.deepEqual([RANGES.today.days, RANGES['7d'].days, RANGES['28d'].days], [1, 7, 28]);
});

test('요청은 보고서 5개이고 모두 같은 기간을 쓴다', () => {
  const body = buildBatchRequest('7d');
  assert.equal(body.requests.length, 5);
  for (const request of body.requests) assert.deepEqual(request.dateRanges, [RANGES['7d'].dateRange]);
  const dims = body.requests.map((r) => (r.dimensions ?? []).map((d) => d.name));
  assert.deepEqual(dims[0], []);
  assert.deepEqual(dims[1], ['date']);
  assert.deepEqual(dims[2], ['eventName', 'customEvent:resort_id']);
  assert.deepEqual(dims[3], ['eventName', 'customEvent:resort_id', 'customEvent:camera_name']);
  assert.deepEqual(dims[4], ['deviceCategory']);
  assert.deepEqual(body.requests[2].dimensionFilter.filter.inListFilter.values, ['view_resort', 'open_official', 'add_favorite']);
  assert.deepEqual(body.requests[3].dimensionFilter.filter.inListFilter.values, ['play_camera', 'camera_offline']);
  assert.deepEqual(buildChannelRequest('today').dateRanges, [RANGES.today.dateRange]);
});

test('응답을 화면용 값으로 바꾼다', () => {
  const response = {
    reports: [
      { rows: [row([], [12, 9, 20, 31])] },
      { rows: [row(['20261117'], [4]), row(['20261118'], [8])] },
      {
        rows: [
          row(['view_resort', 'konjiam'], [5]),
          row(['view_resort', 'yongpyong'], [9]),
          row(['open_official', 'konjiam'], [3]),
          row(['add_favorite', 'yongpyong'], [2]),
          row(['view_resort', '(not set)'], [1]),
          row(['view_resort', 'closed_resort'], [1]),
        ],
      },
      {
        rows: [
          row(['play_camera', 'yongpyong', '옐로우 슬로프'], [7]),
          row(['camera_offline', 'jisan', '레몬탑승장'], [4]),
          row(['play_camera', 'jisan', '레몬탑승장'], [1]),
        ],
      },
      { rows: [row(['mobile'], [10]), row(['desktop'], [2])] },
    ],
  };
  const d = parseDashboard(response, resorts, { days: 3, today: '2026-11-18' });

  assert.deepEqual(d.kpi, { users: 12, newUsers: 9, sessions: 20, views: 31 });
  assert.deepEqual(d.daily, [
    { date: '2026-11-16', users: 0 },
    { date: '2026-11-17', users: 4 },
    { date: '2026-11-18', users: 8 },
  ]);
  assert.deepEqual(d.resorts.map((r) => [r.name, r.views, r.official, r.favorites]), [
    ['모나용평', 9, 0, 2],
    ['곤지암', 5, 3, 0],
    ['closed_resort', 1, 0, 0],
    ['미분류', 1, 0, 0],
  ]);
  assert.deepEqual(d.cameras, [
    { resort: '모나용평', camera: '옐로우 슬로프', plays: 7, offline: 0 },
    { resort: '지산포레스트', camera: '레몬탑승장', plays: 1, offline: 4 },
  ]);
  assert.deepEqual(d.devices, [{ label: '모바일', users: 10 }, { label: 'PC', users: 2 }]);
});

test('데이터가 없어도 빈 값으로 돌려준다', () => {
  for (const response of [{}, { reports: [] }, { reports: [{}, {}, {}, {}, {}] }, null]) {
    const d = parseDashboard(response, resorts, { days: 2, today: '2026-11-18' });
    assert.deepEqual(d.kpi, { users: 0, newUsers: 0, sessions: 0, views: 0 });
    assert.deepEqual(d.daily, [{ date: '2026-11-17', users: 0 }, { date: '2026-11-18', users: 0 }]);
    assert.deepEqual([d.resorts, d.cameras, d.devices], [[], [], []]);
  }
});

test('월이 바뀌는 구간도 날짜를 채운다', () => {
  const d = parseDashboard({}, resorts, { days: 3, today: '2026-12-01' });
  assert.deepEqual(d.daily.map((x) => x.date), ['2026-11-29', '2026-11-30', '2026-12-01']);
});

test('유입 경로와 실시간 값', () => {
  const channels = parseChannels({ rows: [row(['Direct'], [6]), row(['Organic Social'], [3]), row(['Something New'], [1])] });
  assert.deepEqual(channels, [
    { label: '직접 방문', sessions: 6 },
    { label: 'SNS', sessions: 3 },
    { label: 'Something New', sessions: 1 },
  ]);
  assert.deepEqual(parseChannels({}), []);
  assert.equal(parseRealtime({ rows: [row([], [3])] }), 3);
  assert.equal(parseRealtime({}), 0);
});
