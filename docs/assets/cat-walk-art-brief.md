# 고양이 걷는 포즈 아트 발주서 (1차 납품 완료)

> 2026-08-22: 16종 `walk.webp` 1차 납품분을 앱에 반영했다. 아래는 다음 차수
> (walk_a/walk_b 2프레임)를 받을 때 그대로 쓰는 규격이다.

고객지원실(아이소메트릭 방)에서 손님 고양이가 **문에서 자리까지 걸어오는**
장면에 쓴다. 지금은 `idle.webp` 한 장에 위아래 흔들림만 얹어 대신 쓰고 있고,
아래 규격대로 파일이 들어오면 코드 수정 없이 걷는 그림으로 바뀐다.

## 규격

기존 `idle.webp`와 **같은 캔버스·같은 발밑선**이어야 한다. 다르면 걷다가
앉는 순간 고양이가 위아래로 튄다.

| 항목 | 값 |
|---|---|
| 캔버스 | 512 × 512 px, 배경 완전 투명 |
| 포맷 | WebP (PNG로 주면 변환해서 넣는다) |
| 몸 크기 | 캔버스 가로 중앙, 내용 폭 약 280~330px |
| 발밑선 | 가장 아래 픽셀이 y ≈ 471 (캔버스 높이의 0.92) |
| 시점 | 아이소메트릭 3/4 측면. 기존 idle과 같은 각도 |
| 방향 | **화면 오른쪽 아래로 걸어가는 자세 한 방향만.** 왼쪽으로 갈 때는 코드가 좌우 반전해서 쓴다 |
| 프레임 | 2장 — `walk_a`(왼발 앞), `walk_b`(오른발 앞). 1장만 와도 동작한다 |
| 그림자 | 넣지 말 것. 접지 그림자는 코드가 따로 그린다 |

## 파일 이름과 위치

```
catdex-client/assets/support-room/cats/actions/<캐릭터>/walk_a.webp
catdex-client/assets/support-room/cats/actions/<캐릭터>/walk_b.webp
```

## 캐릭터 16종

기존 `idle.webp`의 털색·무늬를 그대로 따라야 한다. 같은 폴더의 idle을
참고 이미지로 같이 주면 색이 어긋나지 않는다.

```
bicolor_cow      bicolor_spotted   bicolor_tuxedo   fallback_cream
point_reserved   solid_black       solid_brown      solid_cream
solid_gray       solid_orange      solid_white      tabby_brown
tabby_gray       tabby_orange      tortie_calico    tortie_dark
```

## 받은 다음에 할 일

`catdex-client/src/features/support-room-v3/support-room-v3.cat-walk.ts`의
`CAT_WALK_FRAMES` 표에 캐릭터마다 `require(...)` 두 줄을 적으면 끝이다.
표가 비어 있으면 지금처럼 idle로 대체된다.
