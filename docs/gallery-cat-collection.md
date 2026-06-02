# 갤러리 사진 수집 전환

## 목표

- 촬영 외에도 갤러리 사진으로 고양이를 수집할 수 있게 한다.
- 사진 EXIF GPS가 있으면 앱의 지역 목록 중 가장 가까운 동네를 제안한다.
- EXIF GPS가 없거나 매칭이 애매하면 사용자가 직접 동네 단위 지역을 입력하거나 선택하게 한다.
- GPS 원본 좌표는 저장하지 않고, `regionName` 같은 동네 단위 정보만 저장한다.
- 업로드 이미지는 재인코딩해 위치 EXIF가 남지 않게 한다.

## 비목표

- 원본 GPS 좌표 저장
- EXIF 위치를 신뢰한 자동 확정
- 외부 지도/주소 API를 통한 상세 주소 역지오코딩
- 클라이언트에 Supabase `service_role` 또는 위치 관련 secret 노출

## 단계

### 1단계: 갤러리 선택 추가

- `expo-image-picker`로 갤러리 이미지를 선택한다.
- `exif: true`로 EXIF를 요청하되, GPS 정보가 없을 수 있음을 정상 흐름으로 처리한다.
- 선택한 이미지는 촬영 이미지와 같은 등록 폼으로 보낸다.
- 구현 위치: `catdex-client/src/features/capture/CaptureScreen.tsx`
- 상태: 완료

### 2단계: EXIF GPS 기반 지역 제안

- EXIF의 위도/경도를 클라이언트 메모리에서만 파싱한다.
- 기존 Supabase `regions` 목록과 거리 비교를 해서 가장 가까운 지역을 찾는다.
- 지역 반경 안이면 "사진 위치로 동네를 추정했어요."로 안내하고 폼에 기본값으로 넣는다.
- 반경 밖이면 자동 입력하지 않고 직접 선택/입력하도록 안내한다.
- 구현 위치: `catdex-client/src/features/capture/utils/exifLocation.ts`
- 상태: 완료

### 3단계: 수동 지역 선택

- 등록 폼에서 발견 장소 입력을 유지한다.
- 등록된 지역 목록 칩을 제공해 사용자가 동네 단위로 빠르게 선택할 수 있게 한다.
- 최종 저장값은 `regionName`만 사용한다.
- 구현 위치: `catdex-client/src/features/capture/components/CatRegisterForm.tsx`
- 상태: 완료

### 4단계: 업로드 이미지 위치정보 제거

- 저장 전 `expo-image-manipulator`로 JPEG 재인코딩한다.
- 서버에는 재인코딩된 이미지 파일만 업로드한다.
- GPS 원본 좌표와 EXIF 객체는 Supabase 테이블에 저장하지 않는다.
- 구현 위치:
  - `catdex-client/src/features/capture/utils/sanitizeCaptureImage.ts`
  - `catdex-client/src/shared/api/app.api.ts`
- 상태: 완료

## 구현 메모

- 갤러리 이미지는 선택 직후 재인코딩한 URI만 등록 폼에 전달한다.
- EXIF GPS는 지역 제안 계산에만 쓰고 상태나 Supabase 저장값에 보관하지 않는다.
- 일부 기기에서 EXIF GPS가 숫자 배열, rational 문자열, rational 객체, 소문자 키로 들어오는 경우를 허용한다.
- Supabase Storage 업로드는 Expo FileSystem `File` API로 재인코딩된 URI를 읽은 뒤 `cat-images` 버킷에 JPEG로 저장한다.
- `create_cat`, `create_cat_sighting`, `record_cat_encounter` RPC에는 원본 좌표 없이 `regionName`과 업로드 이미지 경로만 전달한다.

## 검증

- 갤러리 사진 선택 후 등록 폼으로 이동한다.
- EXIF GPS가 있는 사진은 가까운 지역이 기본 입력된다.
- EXIF GPS가 없는 사진은 직접 지역 입력 안내가 보인다.
- 사용자는 제안 지역을 다른 동네로 바꿀 수 있다.
- `npm run typecheck`를 통과한다.

## 수동 QA 체크리스트

- 홈 또는 하단 탭에서 `촬영` 화면으로 진입한다.
- `갤러리에서 불러오기`를 누르고 사진 접근 권한 요청이 뜨면 허용한다.
- GPS EXIF가 있는 고양이 사진을 선택했을 때 등록 폼으로 이동하고, 반경 안의 지역이면 발견 장소가 자동 입력되는지 확인한다.
- GPS EXIF가 없거나 등록 지역 반경 밖 사진을 선택했을 때 직접 선택/입력 안내가 보이고 발견 장소가 비어 있는지 확인한다.
- 지역 칩을 눌러 제안 지역을 다른 동네로 바꿀 수 있는지 확인한다.
- 이름, 털 색상, 성격 태그, 메모를 입력하고 `도감에 등록하기`가 성공하는지 확인한다.
- 이름 없이 발견 장소만 입력하고 `미확인 제보로 남기기`가 성공하는지 확인한다.
- 저장 후 도감/지도에서 정확한 좌표가 아니라 지역명 기준 기록만 보이는지 확인한다.
