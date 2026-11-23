import test from 'node:test';
import assert from 'node:assert/strict';
import { RANGES, buildBatchRequest, buildChannelRequest, buildTimeRequest, parseDashboard, parseChannels, parseHours, parseWeekdays, parseRealtime } from '../js/stats-data.js';

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
  assert.deepEqual(body.requests[2].dimensionFilter.filter.inListFilter.values, ['view_resort', 'open_official', 'add_favorite', 'share']);
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
          row(['share', 'konjiam'], [4]),
          row(['share', 'site'], [2]),
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
  assert.deepEqual(d.shares, { total: 6, site: 2 });
  assert.equal(d.resorts.find((r) => r.name === '곤지암').shares, 4);
  assert.equal(d.resorts.some((r) => r.name === 'site'), false);
  assert.deepEqual(d.cameras, [
    { resort: '모나용평', resortId: 'yongpyong', camera: '옐로우 슬로프', plays: 7, offline: 0 },
    { resort: '지산포레스트', resortId: 'jisan', camera: '레몬탑승장', plays: 1, offline: 4 },
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
  const channels = parseChannels({ rows: [
    row(['Direct', '(direct)'], [6]),
    row(['Organic Social', 'l.instagram.com'], [1]),
    row(['Organic Social', 'share'], [3]),
    row(['Organic Social', 'instagram.com'], [1]),
    row(['Referral', 'some.blog.example'], [2]),
    row(['Something New', '(not set)'], [1]),
  ] });
  assert.deepEqual(channels, [
    { label: '직접 방문', sessions: 6, sources: [] },
    { label: 'SNS', sessions: 5, sources: [{ label: '공유 링크', sessions: 3 }, { label: '인스타그램', sessions: 2 }] },
    { label: '다른 사이트 링크', sessions: 2, sources: [{ label: 'some.blog.example', sessions: 2 }] },
    { label: 'Something New', sessions: 1, sources: [] },
  ]);
  assert.deepEqual(buildChannelRequest('7d').dimensions.map((d) => d.name), ['sessionDefaultChannelGroup', 'sessionSource']);
  assert.deepEqual(parseChannels({}), []);
  assert.equal(parseRealtime({ rows: [row([], [3])] }), 3);
  assert.equal(parseRealtime({}), 0);
});

test('확인이 필요한 카메라는 송출 없음 비율이 높은 순으로 고른다', async () => {
  const { flagCameras, offlineRate } = await import('../js/stats-data.js');
  const cameras = [
    { camera: '가', plays: 90, offline: 10 }, // 10%: 기준 미만
    { camera: '나', plays: 50, offline: 50 }, // 50%
    { camera: '다', plays: 0, offline: 4 }, // 100%
    { camera: '라', plays: 80, offline: 20 }, // 20%
    { camera: '마', plays: 30, offline: 0 },
  ];
  assert.equal(offlineRate(cameras[1]), 50);
  assert.equal(offlineRate({ plays: 0, offline: 0 }), 0);
  assert.deepEqual(flagCameras(cameras).map((c) => c.camera), ['다', '나', '라']);
  assert.deepEqual(flagCameras(cameras, { limit: 1 }).map((c) => c.camera), ['다']);
});

test('시간대·요일 요청은 유입 경로와 한 묶음으로 보낸다', () => {
  const { requests } = buildTimeRequest('28d');
  assert.equal(requests.length, 3);
  assert.deepEqual(requests[0], buildChannelRequest('28d'));
  assert.deepEqual(requests.map((r) => r.dimensions[0].name), ['sessionDefaultChannelGroup', 'hour', 'dayOfWeek']);
  assert.ok(requests.every((r) => r.dateRanges[0] === RANGES['28d'].dateRange));
});

test('시간대별: 24칸을 채우고 없는 시간은 0', () => {
  const hours = parseHours({ rows: [row(['20'], [12]), row(['08'], [5]), row(['(other)'], [9]), row(['24'], [1])] });
  assert.equal(hours.length, 24);
  assert.deepEqual(hours[8], { hour: 8, sessions: 5 });
  assert.deepEqual(hours[20], { hour: 20, sessions: 12 });
  assert.equal(hours.reduce((sum, x) => sum + x.sessions, 0), 17);
  assert.equal(parseHours({}).every((x) => x.sessions === 0), true);
});

test('요일별: 월요일부터 일요일 순서, 0 은 일요일', () => {
  const days = parseWeekdays({ rows: [row(['0'], [7]), row(['6'], [30]), row(['1'], [2])] });
  assert.deepEqual(days.map((d) => d.label), ['월', '화', '수', '목', '금', '토', '일']);
  assert.deepEqual(days.map((d) => d.sessions), [2, 0, 0, 0, 0, 30, 7]);
  assert.equal(parseWeekdays({}).length, 7);
});
