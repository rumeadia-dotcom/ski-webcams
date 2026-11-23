// 통계 대시보드용 데이터. Google Analytics Data API 요청을 만들고, 응답을 화면용 값으로 바꾼다.
// 화면(DOM)과 로그인은 다루지 않는다.

export const RANGES = {
  today: { label: '오늘', days: 1, dateRange: { startDate: 'today', endDate: 'today' } },
  '7d': { label: '최근 7일', days: 7, dateRange: { startDate: '6daysAgo', endDate: 'today' } },
  '28d': { label: '최근 28일', days: 28, dateRange: { startDate: '27daysAgo', endDate: 'today' } },
};

const RESORT_EVENTS = ['view_resort', 'open_official', 'add_favorite'];
const CAMERA_EVENTS = ['play_camera', 'camera_offline'];
const UNSET = '(not set)';

const dims = (...names) => names.map((name) => ({ name }));
const metrics = (...names) => names.map((name) => ({ name }));
const eventIn = (values) => ({ filter: { fieldName: 'eventName', inListFilter: { values } } });

// 한 번에 보낼 수 있는 보고서는 5개까지다.
export function buildBatchRequest(rangeKey) {
  const dateRanges = [RANGES[rangeKey].dateRange];
  return {
    requests: [
      { dateRanges, metrics: metrics('activeUsers', 'newUsers', 'sessions', 'screenPageViews') },
      { dateRanges, dimensions: dims('date'), metrics: metrics('activeUsers') },
      {
        dateRanges,
        dimensions: dims('eventName', 'customEvent:resort_id'),
        metrics: metrics('eventCount'),
        dimensionFilter: eventIn(RESORT_EVENTS),
        limit: 500,
      },
      {
        dateRanges,
        dimensions: dims('eventName', 'customEvent:resort_id', 'customEvent:camera_name'),
        metrics: metrics('eventCount'),
        dimensionFilter: eventIn(CAMERA_EVENTS),
        limit: 1000,
      },
      { dateRanges, dimensions: dims('deviceCategory'), metrics: metrics('activeUsers') },
    ],
  };
}

export function buildChannelRequest(rangeKey) {
  return {
    dateRanges: [RANGES[rangeKey].dateRange],
    dimensions: dims('sessionDefaultChannelGroup', 'sessionSource'),
    metrics: metrics('sessions'),
  };
}

// 유입 경로, 시간대별, 요일별 방문을 한 번에 요청한다(첫 묶음이 5개로 가득 차서 따로 보낸다).
export function buildTimeRequest(rangeKey) {
  const dateRanges = [RANGES[rangeKey].dateRange];
  return {
    requests: [
      buildChannelRequest(rangeKey),
      { dateRanges, dimensions: dims('hour'), metrics: metrics('sessions') },
      { dateRanges, dimensions: dims('dayOfWeek'), metrics: metrics('sessions') },
    ],
  };
}

export const REALTIME_REQUEST = { metrics: metrics('activeUsers') };

const rowsOf = (report) => report?.rows ?? [];
const dim = (row, i) => row.dimensionValues?.[i]?.value ?? '';
const num = (row, i = 0) => Number(row.metricValues?.[i]?.value ?? 0) || 0;
const pad = (n) => String(n).padStart(2, '0');

// today('YYYY-MM-DD')까지 days 일의 날짜 목록. 방문이 없던 날도 0 으로 보여 주기 위해 쓴다.
function lastDays(days, today) {
  const [y, m, d] = today.split('-').map(Number);
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1, d - (days - 1 - i)));
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  });
}

export function todayInSeoul(now = new Date()) {
  const seoul = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${seoul.getUTCFullYear()}-${pad(seoul.getUTCMonth() + 1)}-${pad(seoul.getUTCDate())}`;
}

const DEVICE_LABELS = { mobile: '모바일', desktop: 'PC', tablet: '태블릿', 'smart tv': 'TV' };

export function parseDashboard(response, resorts, { days, today }) {
  const [kpiReport, dailyReport, resortReport, cameraReport, deviceReport] = response?.reports ?? [];
  const nameOf = (id) => (id === UNSET || id === '' ? '미분류' : resorts.find((r) => r.id === id)?.name ?? id);

  const kpiRow = rowsOf(kpiReport)[0];
  const kpi = {
    users: kpiRow ? num(kpiRow, 0) : 0,
    newUsers: kpiRow ? num(kpiRow, 1) : 0,
    sessions: kpiRow ? num(kpiRow, 2) : 0,
    views: kpiRow ? num(kpiRow, 3) : 0,
  };

  const usersByDate = new Map(rowsOf(dailyReport).map((row) => {
    const raw = dim(row, 0);
    return [`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`, num(row)];
  }));
  const daily = lastDays(days, today).map((date) => ({ date, users: usersByDate.get(date) ?? 0 }));

  const resortMap = new Map();
  for (const row of rowsOf(resortReport)) {
    const name = nameOf(dim(row, 1));
    const entry = resortMap.get(name) ?? { name, views: 0, official: 0, favorites: 0 };
    const field = { view_resort: 'views', open_official: 'official', add_favorite: 'favorites' }[dim(row, 0)];
    if (field) entry[field] += num(row);
    resortMap.set(name, entry);
  }
  const resortList = [...resortMap.values()].sort((a, b) =>
    b.views - a.views || (a.name === '미분류') - (b.name === '미분류') || a.name.localeCompare(b.name, 'ko'));

  const cameraMap = new Map();
  for (const row of rowsOf(cameraReport)) {
    const resort = nameOf(dim(row, 1));
    const camera = dim(row, 2) === UNSET || dim(row, 2) === '' ? '미분류' : dim(row, 2);
    const key = `${resort}\u0000${camera}`;
    const resortId = resorts.some((r) => r.id === dim(row, 1)) ? dim(row, 1) : null;
    const entry = cameraMap.get(key) ?? { resort, resortId, camera, plays: 0, offline: 0 };
    if (dim(row, 0) === 'play_camera') entry.plays += num(row);
    else if (dim(row, 0) === 'camera_offline') entry.offline += num(row);
    cameraMap.set(key, entry);
  }
  const cameras = [...cameraMap.values()].sort((a, b) => b.plays + b.offline - (a.plays + a.offline));

  const devices = rowsOf(deviceReport)
    .map((row) => ({ label: DEVICE_LABELS[dim(row, 0)] ?? dim(row, 0), users: num(row) }))
    .sort((a, b) => b.users - a.users);

  return { kpi, daily, resorts: resortList, cameras, devices };
}

// 재생을 시도한 횟수 중 "송출 없음"으로 끝난 비율(0~100, 정수).
export function offlineRate(camera) {
  const tries = camera.plays + camera.offline;
  return tries > 0 ? Math.round((camera.offline / tries) * 100) : 0;
}

// 확인이 필요한 카메라: 송출 없음 비율이 minRate 이상인 것을 비율 높은 순으로 limit 개.
export function flagCameras(cameras, { minRate = 20, limit = 5 } = {}) {
  return cameras
    .filter((c) => c.offline > 0 && offlineRate(c) >= minRate)
    .sort((a, b) => offlineRate(b) - offlineRate(a) || b.offline - a.offline)
    .slice(0, limit);
}

const CHANNEL_LABELS = {
  Direct: '직접 방문',
  'Organic Search': '검색',
  'Organic Social': 'SNS',
  Referral: '다른 사이트 링크',
  'Organic Video': '동영상',
  Unassigned: '분류 안 됨',
};

// 출처 이름. 'share' 는 사이트의 공유 버튼으로 만든 주소로 들어온 방문이다.
const SOURCE_LABELS = [
  [/^share$/, '공유 링크'],
  [/instagram/, '인스타그램'],
  [/facebook|^fb\b/, '페이스북'],
  [/^t\.co$|twitter|^x\.com$/, 'X'],
  [/kakao/, '카카오'],
  [/naver/, '네이버'],
  [/daum/, '다음'],
  [/youtube/, '유튜브'],
  [/google/, '구글'],
];
const NO_SOURCE = new Set(['(direct)', '(not set)', '']);

export function sourceLabel(source) {
  return SOURCE_LABELS.find(([pattern]) => pattern.test(source))?.[1] ?? source;
}

// 유입 경로별 방문 수와, 그 안에서 어느 사이트(출처)였는지.
export function parseChannels(report) {
  const channels = new Map();
  for (const row of rowsOf(report)) {
    const label = CHANNEL_LABELS[dim(row, 0)] ?? dim(row, 0);
    const channel = channels.get(label) ?? { label, sessions: 0, sources: [] };
    channel.sessions += num(row);
    const source = dim(row, 1) ?? '';
    if (!NO_SOURCE.has(source)) {
      const name = sourceLabel(source);
      const found = channel.sources.find((s) => s.label === name);
      if (found) found.sessions += num(row);
      else channel.sources.push({ label: name, sessions: num(row) });
    }
    channels.set(label, channel);
  }
  return [...channels.values()]
    .map((c) => ({ ...c, sources: c.sources.sort((a, b) => b.sessions - a.sessions) }))
    .sort((a, b) => b.sessions - a.sessions);
}

// 0시부터 23시까지 24칸. 기록이 없는 시간은 0으로 채운다.
export function parseHours(report) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, sessions: 0 }));
  for (const row of rowsOf(report)) {
    const hour = Number(dim(row, 0));
    if (Number.isInteger(hour) && hours[hour]) hours[hour].sessions += num(row);
  }
  return hours;
}

// 월요일부터 일요일까지 7칸. 애널리틱스의 요일 번호는 0 이 일요일이다.
const WEEKDAYS = [[1, '월'], [2, '화'], [3, '수'], [4, '목'], [5, '금'], [6, '토'], [0, '일']];
export function parseWeekdays(report) {
  const counts = new Map();
  for (const row of rowsOf(report)) counts.set(Number(dim(row, 0)), (counts.get(Number(dim(row, 0))) ?? 0) + num(row));
  return WEEKDAYS.map(([number, label]) => ({ label, sessions: counts.get(number) ?? 0 }));
}

export function parseRealtime(report) {
  const row = rowsOf(report)[0];
  return row ? num(row) : 0;
}
