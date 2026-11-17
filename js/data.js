// 스키장·웹캠 데이터. 2026-11-17 조사 기준.
// mode: 'direct' 사이트 안에서 재생 / 'official' 공식 웹캠 페이지를 새 탭으로 / 'none' 웹캠 없음
// 좌표 출처: OpenStreetMap Nominatim 검색 결과 (날씨 조회용)
// 이 파일에는 IP 주소와 토큰이 든 주소를 적지 않는다.

const hls = (name, src) => ({ name, type: 'hls', src });

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
    mode: 'direct',
    officialUrl: 'https://www.yongpyong.co.kr/kor/guide/realTimeNews/ypResortWebcam.do',
    cams: [
      hls('옐로우 슬로프', yongpyong('cam11')),
      hls('베이스전경 / 레드 슬로프', yongpyong('cam08')),
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
    cams: [{ name: '알펜시아 실시간', type: 'youtube', src: 'Aqlk0xGVoBw' }],
  },
  {
    id: 'oakvalley',
    name: '오크밸리',
    lat: 37.4022,
    lon: 127.8191,
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
    cams: [],
  },
  {
    id: 'o2',
    name: '오투리조트',
    lat: 37.1735,
    lon: 128.9383,
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
];

// 휴대폰(iOS·Android)에서는 모바일 전용 공식 페이지가 있으면 그 주소를 쓴다.
export function officialUrlFor(resort, os) {
  const isPhone = os === 'ios' || os === 'android';
  return (isPhone && resort.officialUrlMobile) || resort.officialUrl;
}
