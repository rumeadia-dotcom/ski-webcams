// 스키장·웹캠 데이터. 2026-11-17 조사 기준.
// mode: 'direct' 사이트 안에서 재생 / 'official' 공식 웹캠 페이지를 새 탭으로 / 'none' 웹캠 없음
// 좌표 출처: OpenStreetMap Nominatim 검색 결과 (날씨 조회용)
// 이 파일에는 IP 주소와 토큰이 든 주소를 적지 않는다.
// 일본 스키장(country: 'jp')은 2026-11-27 추가. 카메라 목록은 공개 저장소 hletrd/slopes(Apache-2.0)를 참고했고,
// 유튜브 중계가 살아 있는지는 유튜브 공개 조회로 확인했다. 유튜브 중계는 다시 시작하면 주소(영상 ID)가 바뀐다.
// 그때는 화면의 공식 페이지 버튼으로 볼 수 있고, 여기 ID 를 새로 적어야 한다.

const hls = (name, src) => ({ name, type: 'hls', src });
const yt = (name, src) => ({ name, type: 'youtube', src });

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
    mode: 'direct',
    officialUrl: 'https://www.alpensia.com/guide/web-cam.do',
    cams: [yt('알펜시아 실시간', 'Aqlk0xGVoBw')],
  },
  {
    id: 'oakvalley',
    name: '오크밸리',
    lat: 37.4022,
    lon: 127.8191,
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
    mode: 'none',
    officialUrl: 'https://www.edenvalley.co.kr/main.asp',
    cams: [],
  },
  // ---------- 일본 ----------
  {
    id: 'niseko-village',
    name: '니세코 빌리지',
    country: 'jp',
    area: '홋카이도',
    lat: 42.8474,
    lon: 140.6755,
    mode: 'direct',
    officialUrl: 'https://www.niseko-village.com/ja/nisekovillage/webcam/',
    cams: [yt('곤돌라 베이스', 'w1BuUCVYdsQ'), yt('그린 리프', 'WMAL8MGGnRg')],
  },
  {
    id: 'niseko-hanazono',
    name: '니세코 하나조노',
    country: 'jp',
    area: '홋카이도',
    lat: 42.8933,
    lon: 140.6974,
    mode: 'direct',
    officialUrl: 'https://www.youtube.com/channel/UCrNyeY4kGLL0-Hs8wC98peg',
    cams: [yt('베이스', '1ksmiy6EsDo')],
  },
  {
    id: 'kiroro',
    name: '키로로',
    country: 'jp',
    area: '홋카이도',
    lat: 43.0636,
    lon: 140.9989,
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
    id: 'zao',
    name: '자오 온천',
    country: 'jp',
    area: '도호쿠',
    lat: 38.1613,
    lon: 140.4077,
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
