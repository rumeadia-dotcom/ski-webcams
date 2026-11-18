---
name: 스키장 웹캠
description: 국내 스키장의 지금 모습, 눈, 가는 길을 한 화면에서 확인하는 모바일 웹
colors:
  slope-blue: "#0a63bd"
  on-slope-blue: "#ffffff"
  overcast-bg: "#f3f6f9"
  fresh-snow-surface: "#ffffff"
  ink: "#14202b"
  lift-cable-gray: "#5a6978"
  ridge-line: "#dce4eb"
  today-wash: "#e8f1fb"
  snowfall-blue: "#1763b8"
  rain-blue: "#3b6ea8"
  low-sun-amber: "#8a5600"
  night-stage: "#0b1118"
  on-night-stage: "#e8eef3"
  level-smooth: "#1f9d55"
  level-slow: "#e0a800"
  level-jam: "#d93025"
  dark-slope-blue: "#6cb2f7"
  dark-bg: "#0e151c"
  dark-surface: "#17212b"
  dark-ink: "#e8eef3"
  dark-gray: "#97a7b6"
  dark-line: "#27343f"
  dark-today-wash: "#1e3145"
  dark-snowfall-blue: "#8cc4ff"
  dark-amber: "#f2b63c"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
  figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  row:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  stamp:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard', 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  day: "10px"
  control: "12px"
  card: "16px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  gutter: "16px"
  section: "24px"
  tap: "48px"
components:
  button-primary:
    backgroundColor: "{colors.slope-blue}"
    textColor: "{colors.on-slope-blue}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "{spacing.tap}"
  button-line:
    backgroundColor: "{colors.fresh-snow-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "{spacing.tap}"
  camera-button:
    backgroundColor: "{colors.fresh-snow-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
    height: "{spacing.tap}"
  camera-button-selected:
    backgroundColor: "{colors.fresh-snow-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.fresh-snow-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
  list-row:
    backgroundColor: "{colors.fresh-snow-surface}"
    textColor: "{colors.ink}"
    height: "64px"
  day-cell-today:
    backgroundColor: "{colors.today-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.day}"
  video-stage:
    backgroundColor: "{colors.night-stage}"
    textColor: "{colors.on-night-stage}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.overcast-bg}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
---

# Design System: 스키장 웹캠

## Overview

**Creative North Star: "리프트 타기 전 전광판"**

스키장 입구의 전광판은 지나가는 사람이 멈추지 않고도 읽을 수 있어야 한다. 이 사이트도 같다. 방문자는 카카오톡 링크를 누르고 몇 초 안에 "지금 갈 만한가"를 판단한 뒤 닫는다. 그래서 화면의 주인공은 영상과 숫자와 상태이고, 나머지는 모두 물러나 있다.

부품은 차분하고 절제되어 있다. 그림자 없이 얇은 테두리와 둥근 모서리만으로 구역을 나누고, 강조색은 누를 수 있는 것과 지금 선택된 것에만 쓴다. 꾸밈보다 판독이 먼저다. 야외에서, 한 손으로, 장갑을 낀 채 봐도 읽히고 눌려야 한다.

**Key Characteristics:**
- 영상과 숫자가 가장 크고, 설명은 작고 회색이다.
- 평평하다. 깊이는 배경과 카드의 밝기 차이, 얇은 테두리로만 만든다.
- 모든 데이터에 기준 시각이 붙는다.
- 라이트와 다크를 같은 무게로 지원한다. 시스템 설정을 따른다.
- 휴대폰 한 손 사용이 기준이다. 터치 영역은 48px.

## Colors

흐린 날 설원의 색이다. 차가운 회청색 바탕 위에 파란 강조색 하나, 그리고 날씨와 교통 상태를 알리는 신호색 몇 개.

### Primary
- **슬로프 블루** (`slope-blue`, 다크에서는 `dark-slope-blue`): 누를 수 있는 것과 선택된 것. 주 버튼 배경, 링크, 선택된 카메라의 테두리, 목록의 "바로 재생" 표시, 포커스 테두리.

### Secondary
- **눈 내리는 파랑** (`snowfall-blue`, 다크 `dark-snowfall-blue`): 눈 소식 전용. 눈 아이콘, "오늘 눈 1cm" 요약, 일별 적설량.
- **비 파랑** (`rain-blue`): 비와 뇌우 아이콘, "지금 비".
- **낮은 해 호박색** (`low-sun-amber`, 다크 `dark-amber`): 맑음 아이콘과 켜진 즐겨찾기 별.

### Tertiary
- **원활 초록 / 서행 노랑 / 정체 빨강** (`level-smooth`, `level-slow`, `level-jam`): 교통 정체 정도를 알리는 10px 점에만 쓴다.

### Neutral
- **흐린 하늘 바탕** (`overcast-bg`, 다크 `dark-bg`): 페이지 배경, 고정 상단 배경, 즐겨찾기와 나머지 목록 사이의 띠.
- **새 눈 표면** (`fresh-snow-surface`, 다크 `dark-surface`): 카드, 목록, 버튼 배경.
- **잉크** (`ink`, 다크 `dark-ink`): 본문과 숫자.
- **리프트 케이블 회색** (`lift-cable-gray`, 다크 `dark-gray`): 설명, 단위, 기준 시각, 꺼진 아이콘.
- **능선** (`ridge-line`, 다크 `dark-line`): 1px 테두리와 구분선.
- **오늘 물들임** (`today-wash`, 다크 `dark-today-wash`): 일별 날씨에서 오늘 칸의 배경.
- **밤 무대** (`night-stage`): 영상 영역 배경. 라이트 화면에서도 어둡다.

### Named Rules
**파랑은 누를 수 있다는 뜻이다.** 슬로프 블루는 조작 가능한 요소와 현재 선택에만 쓴다. 장식이나 제목 강조에 쓰지 않는다.

**신호색에는 글자가 따라붙는다.** 원활·서행·정체 점 옆에는 반드시 같은 뜻의 글자를 둔다. 색만으로 상태를 전달하지 않는다.

## Typography

**Display Font / Body Font:** 시스템 글꼴 (-apple-system, Apple SD Gothic Neo, Pretendard, Noto Sans KR, Malgun Gothic 순)

**Character:** 별도 글꼴을 내려받지 않는다. 링크를 누른 뒤 영상이 뜨기까지의 시간을 글꼴에 쓰지 않기 위해서다. 개성은 크기와 굵기의 대비로 낸다.

### Hierarchy
- **Headline** (700, 40px, 줄 높이 1): 현재 기온. 한 화면에 하나.
- **Figure** (700, 26px): 내 출발지의 소요 시간.
- **Title** (700, 20px): 화면 제목(사이트 이름, 스키장 이름).
- **Row** (600, 17px): 목록의 스키장 이름과 기온.
- **Body** (400, 16px, 줄 높이 1.5): 버튼, 안내 문장, 출발지 줄.
- **Label** (400, 13px): 목록 설명, 일별 날씨 칸, 각주.
- **Stamp** (400, 12px): 기준 시각, 정체 정도 글자, 일별 강수·적설량. 가장 작은 크기다.

### Named Rules
**12px 아래는 없다.** 야외에서 읽어야 하므로 어떤 글자도 12px보다 작게 쓰지 않는다.

**숫자는 폭을 맞춘다.** 기온, 시간, 거리는 `font-variant-numeric: tabular-nums`로 자릿수 폭을 고정한다.

## Layout

한 줄로 흐르는 단일 열이다. 콘텐츠 폭은 최대 720px, 좌우 여백 16px(노치가 있으면 안전 영역만큼 더). 상단 제목 줄은 56px 높이로 화면 위에 고정된다.

스키장 화면의 순서는 영상, 카메라, 날씨, 교통이다. 구역 사이 간격은 12px. 영상은 휴대폰에서 좌우 여백 없이 화면 폭을 다 쓰고 16:9를 유지하며, 600px 이상에서는 여백 안으로 들어와 모서리가 둥글어진다. 가로로 눕힌 휴대폰에서는 영상이 남은 높이를 다 쓴다.

카메라 버튼은 2열 격자(600px 이상 3열)로 모두 보여 준다. 숨는 카메라가 없어야 한다. 일별 날씨는 한 화면에 6칸 반이 보이도록 폭을 잡아, 반쯤 걸친 칸이 옆으로 더 있음을 알린다. 처음 위치는 어제다.

간격 단계는 2 / 4 / 8 / 12 / 16 / 24px. 폭 320px에서도 가로 넘침이 없어야 한다.

## Elevation & Depth

평평하다. 카드와 버튼에는 그림자를 쓰지 않는다. 깊이는 바탕(흐린 하늘)과 표면(새 눈)의 밝기 차이, 그리고 1px 능선 테두리로만 만든다.

### Shadow Vocabulary
- **떠 있는 안내** (`box-shadow: 0 4px 16px rgb(0 0 0 / 0.25)`): 화면 아래에 잠깐 뜨는 안내(토스트)에만 쓴다. 콘텐츠 위에 실제로 떠 있는 유일한 요소다.
- **선택 테두리** (`box-shadow: inset 0 0 0 1px` 슬로프 블루): 선택된 카메라 버튼의 테두리를 2px로 보이게 한다. 깊이가 아니라 상태 표시다.

### Named Rules
**그림자는 떠 있는 것에만.** 페이지 흐름 안에 있는 요소에는 그림자를 주지 않는다.

## Shapes

모서리는 세 단계다. 카드와 목록 16px, 버튼과 안내 12px, 일별 날씨 칸 10px. 원은 정체 정도 점(10px)과 숨긴 스크롤 영역 정도에만 나온다. 테두리는 항상 1px 능선색이고, 굵은 색 테두리로 강조하지 않는다. 재생을 뜻하는 작은 삼각형이 카메라 버튼과 목록의 "바로 재생" 앞에 반복해서 나온다.

## Components

### Buttons
차분하고 절제되어 있다. 크기로 누르기 쉽게 하고, 색은 아낀다.
- **Shape:** 둥근 모서리(12px), 높이 48px.
- **Primary:** 슬로프 블루 배경에 흰 글자, 굵기 600. 화면에 하나만 둔다(공식 페이지 열기, 계속 보기).
- **Line:** 표면 배경에 1px 테두리. 다시 시도 같은 보조 동작.
- **Icon:** 48px 정사각 영역에 24px 선 아이콘(선 굵기 1.8). 뒤로, 공유, 즐겨찾기.
- **Focus:** 2px 슬로프 블루 테두리를 2px 바깥에. 목록 안에서는 잘리지 않게 안쪽으로 그린다.

### Camera Buttons
- **Style:** 표면 배경, 1px 테두리, 12px 모서리, 앞에 회색 재생 삼각형. 2열 격자.
- **State:** 선택되면 테두리와 삼각형이 슬로프 블루, 글자 굵기 600.

### Cards / Containers
- **Corner Style:** 16px
- **Background:** 표면색
- **Shadow Strategy:** 없음
- **Border:** 1px 능선색
- **Internal Padding:** 14~16px
- 카드 안에 카드를 넣지 않는다. 날씨, 교통, 공식 페이지 안내가 각각 하나의 카드다.

### List Row
- 왼쪽 52px 즐겨찾기 별, 가운데 스키장 이름(17px 600)과 설명(13px 회색), 오른쪽 기온과 날씨 아이콘, 그 아래 눈·비 요약(12px 600).
- 행 높이 최소 64px, 행 사이 1px 구분선. 즐겨찾기와 나머지 사이는 8px 바탕색 띠.

### Day Cell
- 요일, 날씨 아이콘, 최고, 최저, 강수 또는 적설을 세로로 쌓는다. 오늘 칸만 물들임 배경과 굵은 글자.

### Traffic Rows
- 내 출발지 한 줄: 회색 "수원에서"와 26px 굵은 소요 시간, 거리, 정체 점.
- 다른 출발지: 44px 높이의 줄 전체가 버튼. 누르면 내 출발지가 바뀐다.

### Video Stage
- 16:9, 밤 무대 배경. 상태 문구(불러오는 중, 송출 없음, 재생 제한)는 영상 위 가운데에 겹쳐 보여 준다.

### Navigation
- 화면 위에 고정된 56px 제목 줄. 스키장 화면은 왼쪽 뒤로가기, 가운데 이름, 오른쪽 공유와 즐겨찾기. 하단 탭이나 메뉴는 없다.

## Do's and Don'ts

### Do:
- **Do** 영상과 숫자를 가장 크게 둔다. 설명은 13px 회색으로 물린다.
- **Do** 날씨와 교통처럼 시간이 지나면 달라지는 데이터에는 "14:45 기준" 같은 기준 시각을 붙인다.
- **Do** 터치 영역을 48px로 잡는다(문장 속 링크 제외, 최소 44px).
- **Do** 라이트와 다크 모두에서 본문 명암비 4.5:1 이상을 확인한다.
- **Do** 신호색 점 옆에 같은 뜻의 글자를 함께 쓴다.

### Don't:
- **Don't** 카드나 버튼에 그림자를 넣지 않는다.
- **Don't** 12px보다 작은 글자를 쓰지 않는다.
- **Don't** 슬로프 블루를 장식에 쓰지 않는다. 누를 수 있는 것과 선택된 것에만 쓴다.
- **Don't** 카메라나 출발지처럼 고를 대상을 화면 밖에 숨기지 않는다.
- **Don't** 웹 글꼴을 내려받지 않는다.
