# Location Feature Merge Notes

작성일: 2026-03-09  
브랜치: `feat-섭외관리페이지DB연결`

## 1) 변경 파일 요약
- 수정: `components/LocationManager.js`
- 수정: `screens/LocationScreen.js`
- 수정: `src/api/locations.js`
- 수정: `src/hooks/useLocations.js`
- 삭제 파일: 없음
- 신규 파일: (이 문서) `MERGE_SUMMARY_LOCATION.md`

## 2) 기능 추가/변경 내역

### A. 섭외 화면 UI/UX (`LocationManager.js`)
- 장소 카드 클릭 동작 변경: 바로 수정 -> 장소 정보(상세) 모달 진입
- 장소 정보 모달에서 `수정` / `삭제` 버튼 제공
- 상세 모달 레이아웃 개선
  - 주요 정보 한눈에 보이도록 압축 정렬
  - 버튼 하단 여백 최소화 후 소폭 여백 재조정
  - 카드-버튼 사이 간격 조정
- 상태 버튼 구성 정리
  - 장소 수정 상태 옵션에서 `요청중` 제거
  - 기본 상태를 `섭외지 답변 대기중`으로 정리
  - 리스트 필터의 `요청중` 탭은 유지
- 요청사항 UI 변경
  - 미니 채팅형(thread + reply) 입력/표시 UI
- 시간 입력 편의성 추가
  - `09` 입력 시 `09:00` 자동 변환
  - `1130` 입력 시 `11:30` 자동 변환
  - 저장 시 최종 정규화 및 시간 범위 검증

### B. 장소 데이터 DB 연동 강화 (`LocationScreen.js`)
- `useLocations(project.id)` 기반으로 장소 목록 fetch/create/update/delete 연결
- DB <-> UI 매핑 로직 추가
  - `shooting_time` ↔ `startTime/endTime`
  - `status/card_status` ↔ 화면 상태값
  - `locations_poc` ↔ `manager`
- 장소 생성/수정 시 `locations.content`에 요청사항 thread JSON 직렬화 저장
- 장소 조회 시 `content` 파싱 로직 강화
  - JSON 문자열/객체/배열/일반 텍스트 fallback 처리
- 요청사항 thread를 `requests` / `request_messages`에도 동기화(dual-write)
- 장소 삭제 콜백 연결 (`onDeleteLocation`)

### C. API/Hook 계층 (`src/api/locations.js`, `src/hooks/useLocations.js`)
- `locations` 조회 시 `locations_poc(*)` 포함
- `updateLocation`에서 POC 재생성(replace) 처리
- Hook에서 `removeLocation` 사용하여 화면 삭제 연동

## 3) Merge 시 확인 포인트
- `LocationManager` props 충돌 여부
  - `onCreateLocation`, `onUpdateLocation`, `onDeleteLocation`
- 상태값 문자열 충돌 여부
  - `섭외지 답변 대기중`, `코디 답변대기중`, `제작진 답변 대기중`
- DB 스키마 확인
  - `locations`, `locations_poc`, `requests`, `request_messages`
  - `locations.content` 타입(JSON/텍스트)과 파싱 호환성

## 4) 회귀 테스트 체크리스트
- [ ] 장소 카드 클릭 시 상세 모달이 먼저 뜨는지
- [ ] 상세 모달에서 수정/삭제 동작이 정상인지
- [ ] 장소 생성/수정/삭제가 DB에 반영되는지
- [ ] 시간 입력 단축(`09`, `1130`)이 저장 시 정상 포맷되는지
- [ ] 요청사항 thread + reply 저장 후 재진입 시 유지되는지
- [ ] 요청사항이 `locations.content`와 `requests/request_messages`에 동기화되는지
- [ ] 상태 필터(특히 `요청중`)가 기존 의도대로 동작하는지

## 5) 권장 커밋 분리(선택)
1. `feat(location-ui): add location detail modal and edit/delete flow`
2. `feat(location-db): map location screen to supabase CRUD + poc`
3. `feat(location-requests): persist thread replies and sync to requests tables`
4. `chore(location-ui): refine detail modal spacing and actions`

## 6) 참고
- 현재 워크트리는 다수 수정이 한 번에 포함되어 있음
- 머지 전 `diff by file`로 충돌 가능 구간(특히 `LocationManager.js`) 우선 확인 권장
