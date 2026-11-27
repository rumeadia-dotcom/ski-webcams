// 스키장·웹캠 데이터. 2026-11-17 조사 기준.
// mode: 'direct' 사이트 안에서 재생 / 'official' 공식 웹캠 페이지를 새 탭으로 / 'none' 웹캠 없음
// 좌표 출처: OpenStreetMap Nominatim 검색 결과 (날씨 조회용)
// 이 파일에는 IP 주소와 토큰이 든 주소를 적지 않는다.
// base·top: 날씨를 하단과 정상으로 나눠 받는 지점(2026-11-27, 좌표는 공개 저장소 hletrd/slopes 의 스키하우스·정상 지점). 없으면 lat·lon 한 곳만 쓴다.
// 일본 스키장의 base·top 은 OpenStreetMap 에 등록된 리프트 승강장 가운데 가장 낮은 곳과 가장 높은 곳이다(2026-11-27 조회).
// 시가 고원은 구마노유 주변 1.5km 를 봐서 요코테야마 리프트가 정상으로 잡혔다.
// 일본 스키장(country: 'jp')은 2026-11-27 추가. 카메라 목록은 공개 저장소 hletrd/slopes(Apache-2.0)를 참고했고,
// 유튜브 중계가 살아 있는지는 유튜브 공개 조회로 확인했다. 유튜브 중계는 다시 시작하면 주소(영상 ID)가 바뀐다.
// 그때는 화면의 공식 페이지 버튼으로 볼 수 있고, 여기 ID 를 새로 적어야 한다.

const hls = (name, src) => ({ name, type: 'hls', src });
const yt = (name, src) => ({ name, type: 'youtube', src });
const embed = (name, src) => ({ name, type: 'embed', src });

const yongpyong = (cam) => `https://live.yongpyong.co.kr/${cam}/index.m3u8`;
const phoenix = (id) => `https://streaming.phoenixhnr.co.kr/hls/${id}.m3u8`;
const welli = (cam) => `https://live.wellihillipark.com/wellihillipark/_definst_/${cam}.stream/playlist.m3u8`;
const jisan = (n) => `https://ant.livecity.co.kr:5443/jisancam/streams/jisan${n}.m3u8`;
const oakvalley = (n) => `https://cctv-oak9.ktcdn.co.kr/cctv/ch${n}.stream/playlist.m3u8`;

export const RESORTS = [
  {
    id: 'yongpyong',
    name: '모나용평',
    lat: 37.6282,
    lon: 128.6777,
    base: { lat: 37.64447, lon: 128.67993 }, // 스키하우스
    top: { lat: 37.61141, lon: 128.67158 }, // 레인보우 정상
    drive: { lat: 37.64433, lon: 128.67927 }, // 차로 도착하는 지점: 드래곤프라자
    mode: 'direct',
    officialUrl: 'https://www.yongpyong.co.kr/kor/guide/realTimeNews/ypResortWebcam.do',
    cams: [
      hls('옐로우 슬로프', yongpyong('cam11')),
      hls('베이스전경 / 레드 슬로프', yongpyong('cam08')),
      // 아래 6대는 공식 웹캠 페이지 목록에는 없지만 같은 영상 서버에서 송출 중인 슬로프 카메라다(2026-11-18 확인).
      // 이름은 영상을 보고 붙였다. 송출이 끊기면 화면에 "현재 송출이 없습니다"로 나온다.
      hls('골드밸리 상단', yongpyong('cam03')),
      hls('골드 하단', yongpyong('cam09')),
      hls('메가그린', yongpyong('cam04')),
      hls('레인보우 상단', yongpyong('cam06')),
      hls('레인보우 하단', yongpyong('cam07')),
      hls('핑크', yongpyong('cam10')),
      hls('발왕산 氣 스카이워크', yongpyong('cam01')),
      hls('발왕산 천년주목숲길', yongpyong('cam02')),
      hls('모나용평 진입로', yongpyong('cam05')),
    ],
  },
  {
    id: 'phoenix',
    name: '휘닉스파크',
    lat: 37.5786,
    lon: 128.3164,
    base: { lat: 37.5833, lon: 128.32511 }, // 스키하우스
    top: { lat: 37.57409, lon: 128.31013 }, // 몽블랑 정상
    drive: { lat: 37.58088, lon: 128.32766 }, // 차로 도착하는 지점: 리조트 입구(태기로)
    mode: 'direct',
    officialUrl: 'https://phoenixhnr.co.kr/page/pyeongchang/guide/operation/sketchMovie',
    cams: [
      hls('베이스', phoenix('bc_02_01')),
      hls('몽블랑', phoenix('mb_03_02')),
      hls('스노우 빌리지', phoenix('yh_01_01')),
      hls('불새마루', phoenix('ht_01_01')),
      hls('호크 / 스패로우', phoenix('yh_02_02')),
      hls('펭귄', phoenix('bc_01')),
      hls('도도', phoenix('sp_01_01')),
    ],
  },
  {
    id: 'welli',
    name: '웰리힐리파크',
    lat: 37.4852,
    lon: 128.2459,
    base: { lat: 37.4905, lon: 128.24957 }, // 스키하우스
    top: { lat: 37.48018, lon: 128.24363 }, // 정상
    mode: 'direct',
    officialUrl: 'https://www.wellihillipark.com/home/customer/webcam',
    officialUrlMobile: 'https://m.wellihillipark.com/customer/webcam', // PC 주소는 휴대폰에서 모바일 홈으로 넘어간다
    cams: [
      hls('슬로프전경', welli('cam04')),
      hls('정상 / 광장', welli('cam05')),
      hls('야외무대 / 광장', welli('cam03')),
      hls('루지', welli('cam02')),
      hls('고카트 / MTB파크', welli('cam06')),
      hls('워터플래닛', welli('cam07')),
    ],
  },
  {
    id: 'jisan',
    name: '지산포레스트',
    lat: 37.2137,
    lon: 127.341,
    base: { lat: 37.21722, lon: 127.3449 }, // 스키하우스
    top: { lat: 37.21146, lon: 127.33968 }, // 블루 정상
    mode: 'direct',
    limitSec: 30,
    officialUrl: 'https://www.jisanresort.co.kr/w/ski/slopes/webcam.asp',
    cams: [
      hls('레몬탑승장', jisan(1)),
      hls('오렌지 / 뉴오렌지탑승장', jisan(2)),
      hls('5번 / 6번 슬로프', jisan(3)),
      hls('블루탑승장', jisan(4)),
      hls('실버탑승장', jisan(5)),
    ],
  },
  {
    id: 'alpensia',
    name: '알펜시아',
    lat: 37.6581,
    lon: 128.6695,
    base: { lat: 37.65695, lon: 128.67235 }, // 스키하우스
    top: { lat: 37.65004, lon: 128.67334 }, // 정상
    mode: 'direct',
    officialUrl: 'https://www.alpensia.com/guide/web-cam.do',
    cams: [yt('알펜시아 실시간', 'Aqlk0xGVoBw')],
  },
  {
    id: 'oakvalley',
    name: '오크밸리',
    lat: 37.4022,
    lon: 127.8191,
    base: { lat: 37.40749, lon: 127.80796 }, // 스키하우스
    top: { lat: 37.40234, lon: 127.81906 }, // 정상
    drive: { lat: 37.41037, lon: 127.81951 }, // 차로 도착하는 지점: 오크밸리2길
    mode: 'direct',
    officialUrl: 'https://oakvalley.co.kr/ski/introduction/realtime',
    cams: [
      hls('스노우파크 옥탑', oakvalley(2)),
      hls('플라워 정상', oakvalley(5)),
      hls('I 슬로프 전경', oakvalley(9)),
      hls('F 슬로프 전경', oakvalley(6)),
      hls('G 슬로프 전경', oakvalley(7)),
    ],
  },
  {
    id: 'konjiam',
    name: '곤지암',
    lat: 37.3346,
    lon: 127.2875,
    base: { lat: 37.33693, lon: 127.29351 }, // 스키하우스
    top: { lat: 37.32892, lon: 127.28119 }, // 정상
    mode: 'official',
    camCount: 5,
    officialUrl: 'https://www.konjiamresort.co.kr/ski/liveCam.dev',
    officialUrlMobile: 'https://m.konjiamresort.co.kr/ski/skiLveCam.dev', // PC용 페이지는 휴대폰에서 보기 어렵다
    cams: [],
  },
  {
    id: 'high1',
    name: '하이원',
    lat: 37.1939,
    lon: 128.8294,
    base: { lat: 37.2079, lon: 128.82583 }, // 스키하우스
    top: { lat: 37.17838, lon: 128.83005 }, // 밸리탑
    drive: { lat: 37.2117, lon: 128.82125 }, // 차로 도착하는 지점: 하이원길
    mode: 'official',
    camCount: 18,
    officialUrl: 'https://www.high1.com/ski/slopeView.do?key=748&mode=p',
    cams: [],
  },
  {
    id: 'muju',
    name: '무주덕유산',
    lat: 35.8905,
    lon: 127.7368,
    base: { lat: 35.89072, lon: 127.73687 }, // 스키하우스
    top: { lat: 35.86457, lon: 127.74448 }, // 설천봉 정상
    mode: 'official',
    camCount: 11,
    officialUrl: 'https://www.mdysresort.com/guide/webcam.asp',
    officialUrlMobile: 'https://m.mdysresort.com/webcam/webcam_20151124.asp',
    cams: [],
  },
  {
    id: 'o2',
    name: '오투리조트',
    lat: 37.1735,
    lon: 128.9383,
    base: { lat: 37.17741, lon: 128.94776 }, // 스키하우스
    top: { lat: 37.16762, lon: 128.92693 }, // 으뜸마루
    drive: { lat: 37.170188, lon: 128.945948 }, // 차로 도착하는 지점: 슬로프 아래 도로
    mode: 'official',
    camCount: 8,
    officialUrl: 'https://www.o2resort.com/SKI/liftInfo.jsp#liftwebcam',
    cams: [],
  },
  {
    id: 'elysian',
    name: '엘리시안 강촌',
    lat: 37.8167,
    lon: 127.5871,
    base: { lat: 37.82027, lon: 127.59007 }, // 스키하우스
    top: { lat: 37.81525, lon: 127.58271 }, // 정상
    mode: 'official',
    camCount: 6,
    officialUrl: 'https://www.elysian.co.kr/about-gangchon/ski',
    cams: [],
  },
  {
    id: 'vivaldi',
    name: '비발디파크',
    lat: 37.6418,
    lon: 127.6875,
    base: { lat: 37.64481, lon: 127.68212 }, // 스키하우스
    top: { lat: 37.63745, lon: 127.69001 }, // 정상
    drive: { lat: 37.64612, lon: 127.68103 }, // 차로 도착하는 지점: 소노벨 비발디파크
    mode: 'official',
    camCount: 7,
    officialUrl: 'https://www.sonohotelsresorts.com/skiboard/status',
    cams: [],
  },
  {
    id: 'eden',
    name: '에덴밸리',
    lat: 35.429,
    lon: 128.9859,
    base: { lat: 35.42875, lon: 128.98446 }, // 스키하우스
    top: { lat: 35.41948, lon: 128.98322 }, // 정상
    mode: 'none',
    officialUrl: 'https://www.edenvalley.co.kr/main.asp',
    cams: [],
  },
  // ---------- 일본 ----------
  {
    // 니세코 유나이티드의 네 스키장(그랑 히라후, 하나조노, 니세코 빌리지, 안누푸리)을 한 곳으로 묶었다. 한 산을 나눠 쓰고 리프트권도 함께 쓴다.
    id: 'niseko',
    name: '니세코',
    country: 'jp',
    area: '홋카이도',
    lat: 42.8645,
    lon: 140.6992, // 그랑 히라후
    base: { lat: 42.85835, lon: 140.70201 }, // 가장 낮은 리프트 승강장
    top: { lat: 42.87082, lon: 140.6624 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://www.niseko.ne.jp/ja/livecamera/',
    // 히라후 카메라 이름은 운영사가 유튜브 중계에 붙인 제목을 따랐다(2026-11-27 확인).
    cams: [
      yt('히라후 베이스', 'LQ_Cv4aFuq8'),
      yt('히라후 마운틴 센터', 'taDZzy8yMTw'),
      yt('히라후 에이스 힐 (요테이산 쪽)', '0zEQmoW6x8E'),
      yt('하나조노 베이스', '1ksmiy6EsDo'),
      yt('빌리지 곤돌라 베이스', 'w1BuUCVYdsQ'),
      yt('빌리지 그린 리프', 'WMAL8MGGnRg'),
      yt('안누푸리 전경', 'z4xJYd7931A'),
    ],
  },
  {
    id: 'kiroro',
    name: '키로로',
    country: 'jp',
    area: '홋카이도',
    lat: 43.0636,
    lon: 140.9989,
    base: { lat: 43.07451, lon: 140.98438 }, // 가장 낮은 리프트 승강장
    top: { lat: 43.05667, lon: 141.0267 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://www.kiroro.co.jp/livecamera/',
    cams: [
      yt('베이스', 'q96NwhD6Lrw'),
      yt('아사리 정상', 'qtU23CdE7mU'),
      yt('나가미네 제2구역', 'RVblxnP4Ry8'),
      yt('24시간 적설계', 'Y3bXHw8TA2o'),
    ],
  },
  {
    id: 'furano',
    name: '후라노',
    country: 'jp',
    area: '홋카이도',
    lat: 43.3326,
    lon: 142.3281,
    base: { lat: 43.3439, lon: 142.36011 }, // 가장 낮은 리프트 승강장
    top: { lat: 43.32432, lon: 142.31925 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://www.princehotels.co.jp/ski/furano/livecamera/',
    // 공식 페이지가 끼워 넣어 보여 주는 화면(SKIDAY)을 같은 주소로 끼워 넣는다. 유튜브가 아니라 자동 갱신 대상이 아니다.
    cams: [
      embed('로프웨이 정상', 'https://skiday.app/qjjomrGpZ2icbbkYBQxh/865036042047983/embed'),
      embed('로프웨이 정상 적설계', 'https://skiday.app/qjjomrGpZ2icbbkYBQxh/869223040349118/embed'),
    ],
  },
  {
    id: 'zao',
    name: '자오 온천',
    country: 'jp',
    area: '도호쿠',
    lat: 38.1613,
    lon: 140.4077,
    base: { lat: 38.15758, lon: 140.38394 }, // 가장 낮은 리프트 승강장
    top: { lat: 38.15473, lon: 140.43118 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://www.youtube.com/channel/UC1xeTccsAQdz7-fF0eAa5HA/streams',
    cams: [
      yt('중앙 슬로프', '416KwGEjTK4'),
      yt('JUPEER 슬로프', 'D4YiBKIsZVA'),
      yt('요코쿠라 슬로프', 'RHfXwQ-rF24'),
      yt('선라이즈 슬로프', 'G-wKM6Dw3kA'),
      yt('주효코겐역', 'rpHUbj-7pR0'),
      yt('로프웨이 주차장', 'Rs4CcR79sWA'),
      yt('오모리 주차장', '6cR55F-J4ps'),
      yt('중앙 로프웨이 제1주차장', '1vhtYFrjxBw'),
      yt('우와노다이 제1주차장', 'DnrgCsF1nAM'),
    ],
  },
  {
    id: 'marunuma',
    name: '마루누마 고원',
    country: 'jp',
    area: '간토',
    lat: 36.8115,
    lon: 139.3464,
    base: { lat: 36.81432, lon: 139.32988 }, // 가장 낮은 리프트 승강장
    top: { lat: 36.8068, lon: 139.3551 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://www.marunuma.jp/winter/live/',
    cams: [
      yt('옐로우 코스 1400m', 'JKcKxGeV0KY'),
      yt('바이올렛 코스 1500m', 'cqvEOhOzN2o'),
      yt('천공 테라스 2000m', 'l3AEMkq3jP4'),
      yt('닛코시라네산', '0Q2YZBnp7vk'),
      yt('돈판 레스토랑', 'Xd5ssXY_BVA'),
      yt('트리 어드벤처', '0dscZRUP6Rg'),
      yt('입구', 'QXtbSWXGamE'),
    ],
  },
  {
    id: 'oze-iwakura',
    name: '오제 이와쿠라',
    country: 'jp',
    area: '간토',
    lat: 36.8223,
    lon: 139.2066,
    base: { lat: 36.81121, lon: 139.22926 }, // 가장 낮은 리프트 승강장
    top: { lat: 36.83041, lon: 139.20331 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://www.oze-iwakura.co.jp/ski/slopeguide/live/',
    cams: [
      yt('로맨스 / 챔피언 A', '4wYgmnaMAaY'),
      yt('국제여자 / 리젠 / 엑스퍼트', 'Isvsz0lBjrk'),
      yt('곤돌라 하부역', 'bB5w9bVNA9s'),
      yt('곤돌라 정상역', 'TDTe8m3Z1MY'),
      yt('니시야마 / 호른 레스토랑', 'yLmHCuy4Wlg'),
    ],
  },
  {
    id: 'kusatsu',
    name: '구사쓰 온천',
    country: 'jp',
    area: '간토',
    lat: 36.631,
    lon: 138.5781,
    base: { lat: 36.62789, lon: 138.58612 }, // 가장 낮은 리프트 승강장
    top: { lat: 36.63017, lon: 138.56211 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://www.932-onsen.com/common/live/',
    cams: [
      yt('덴구야마 베이스', 'eX7vAL4Jtfk'),
      yt('덴구야마 정상', 'hN8mxz3-1pg'),
      yt('국도 292호 입구', 'rHuoK_TWOnA'),
    ],
  },
  {
    id: 'happo-one',
    name: '하쿠바 핫포네',
    country: 'jp',
    area: '주부',
    lat: 36.7036,
    lon: 137.8226,
    base: { lat: 36.69824, lon: 137.83881 }, // 가장 낮은 리프트 승강장
    top: { lat: 36.69697, lon: 137.79927 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://www.happo-one.jp/gelande/livecamera/',
    cams: [
      yt('우사기다이라', '9ej1bDX8Kd8'),
      yt('파노라마', '8xqRaPJX_N4'),
      yt('구로비시 1678m', '21HCv58C99o'),
      yt('시라카바 하단', 'hMY3VnL4Pyk'),
      yt('제3주차장', 'BHo4tHKIDow'),
    ],
  },
  {
    id: 'shigakogen',
    name: '시가 고원',
    country: 'jp',
    area: '주부',
    lat: 36.6789,
    lon: 138.4957, // 구마노유 스키장
    base: { lat: 36.68266, lon: 138.49651 }, // 가장 낮은 리프트 승강장
    top: { lat: 36.67216, lon: 138.52049 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://www.shigakogen.gr.jp/live/index.html',
    cams: [yt('구마노유 베이스', 'n4G4iQTme1g')],
  },
  {
    id: 'yachiho',
    name: '야치호 고원',
    country: 'jp',
    area: '주부',
    lat: 36.0688,
    lon: 138.3756,
    base: { lat: 36.06909, lon: 138.38044 }, // 가장 낮은 리프트 승강장
    top: { lat: 36.06983, lon: 138.37217 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://yachiho-kogen.com/ski/manage25-26/index5_1-4-2.shtml',
    cams: [
      yt('스키장 전경', '-Mn-s1mwG94'),
      yt('제2리프트', 'K75FL2PHBw4'),
      yt('4코스', '03BYfh9kP24'),
      yt('제1 / 아니카 방면', 'SQaPmIFqPD4'),
    ],
  },
  {
    id: 'karuizawa',
    name: '가루이자와 프린스',
    country: 'jp',
    area: '주부',
    lat: 36.3364,
    lon: 138.6434,
    base: { lat: 36.34035, lon: 138.64363 }, // 가장 낮은 리프트 승강장
    top: { lat: 36.33384, lon: 138.64844 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://www.youtube.com/channel/UCnXXZnHcM2Y-WX7U_fNR2Qg',
    cams: [yt('베이스', 'fqgXBt2ZzpE')],
  },
  {
    id: 'arai',
    name: '롯데 아라이',
    country: 'jp',
    area: '주부',
    lat: 36.9909,
    lon: 138.1816,
    base: { lat: 36.99084, lon: 138.1802 }, // 가장 낮은 리프트 승강장
    top: { lat: 36.99319, lon: 138.13858 }, // 가장 높은 리프트 승강장
    mode: 'direct',
    officialUrl: 'https://www.youtube.com/channel/UCykbn5kKdajksZb7C0UyY7A/streams',
    cams: [yt('롯폰기 스테이션', 'kQskivhwAwE')],
  },
];

// 휴대폰(iOS·Android)에서는 모바일 전용 공식 페이지가 있으면 그 주소를 쓴다.
export function officialUrlFor(resort, os) {
  const isPhone = os === 'ios' || os === 'android';
  return (isPhone && resort.officialUrlMobile) || resort.officialUrl;
}

export const isJapan = (resort) => resort.country === 'jp';
