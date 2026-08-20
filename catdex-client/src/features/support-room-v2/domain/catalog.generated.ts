/**
 * 이 파일은 scripts/generate-support-room-v2.js가 생성한다. 손으로 고치지 말 것.
 * 원본: 대한냥냥공사 패키지 assets/v2 (catalog-v2.json schemaVersion 1)
 */
import type { CatalogFurnitureEntry, CatalogSurfaceEntry, FurnitureSpec } from './furniture';

export const FURNITURE_SPECS: readonly FurnitureSpec[] = [
  {
    "id": "visitor_cushion_orange",
    "name": "방문자 방석",
    "group": "interactive",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [
      {
        "x": 0,
        "y": 1,
        "facing": "right"
      }
    ],
    "canFlipX": true,
    "capacity": 1,
    "behaviors": [
      "use_cushion"
    ],
    "layerMode": "compositeInteraction",
    "baselineY": 0.8
  },
  {
    "id": "service_bell_brass",
    "name": "호출벨",
    "group": "interactive",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [
      {
        "x": 0,
        "y": 1,
        "facing": "left"
      },
      {
        "x": -1,
        "y": 0,
        "facing": "right"
      }
    ],
    "canFlipX": true,
    "capacity": 1,
    "behaviors": [
      "press_bell"
    ],
    "layerMode": "compositeInteraction",
    "baselineY": 0.82
  },
  {
    "id": "swivel_chair_lavender",
    "name": "회전의자",
    "group": "interactive",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [
      {
        "x": 0,
        "y": 1,
        "facing": "right"
      }
    ],
    "canFlipX": true,
    "capacity": 1,
    "behaviors": [
      "sit_swivel_chair"
    ],
    "layerMode": "compositeInteraction",
    "baselineY": 0.9
  },
  {
    "id": "paw_stamp_pad_orange",
    "name": "발도장 패드",
    "group": "interactive",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [
      {
        "x": 0,
        "y": 1,
        "facing": "left"
      },
      {
        "x": -1,
        "y": 0,
        "facing": "right"
      }
    ],
    "canFlipX": true,
    "capacity": 1,
    "behaviors": [
      "stamp_paw"
    ],
    "layerMode": "compositeInteraction",
    "baselineY": 0.82
  },
  {
    "id": "paper_basket_cream",
    "name": "종이 바구니",
    "group": "interactive",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [
      {
        "x": 0,
        "y": 1,
        "facing": "right"
      }
    ],
    "canFlipX": true,
    "capacity": 1,
    "behaviors": [
      "hide_paper_basket"
    ],
    "layerMode": "compositeInteraction",
    "baselineY": 0.88
  },
  {
    "id": "document_box_olive",
    "name": "문서 상자",
    "group": "interactive",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [
      {
        "x": 0,
        "y": 1,
        "facing": "right"
      }
    ],
    "canFlipX": true,
    "capacity": 1,
    "behaviors": [
      "peek_document_box"
    ],
    "layerMode": "compositeInteraction",
    "baselineY": 0.88
  },
  {
    "id": "window_bench",
    "name": "창가 벤치",
    "group": "interactive",
    "surface": "floor",
    "footprint": {
      "width": 3,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 0
      }
    ],
    "approachAnchors": [
      {
        "x": 0,
        "y": 1,
        "facing": "right"
      },
      {
        "x": 2,
        "y": 1,
        "facing": "left"
      }
    ],
    "canFlipX": true,
    "capacity": 2,
    "behaviors": [
      "watch_window"
    ],
    "layerMode": "splitLayers",
    "baselineY": 0.82
  },
  {
    "id": "customer_water_station",
    "name": "고객용 정수기",
    "group": "interactive",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [
      {
        "x": 0,
        "y": 1,
        "facing": "right"
      }
    ],
    "canFlipX": false,
    "capacity": 1,
    "behaviors": [
      "drink_water"
    ],
    "layerMode": "splitLayers",
    "baselineY": 0.86
  },
  {
    "id": "reception_desk_cream",
    "name": "접수 데스크",
    "group": "office",
    "surface": "floor",
    "footprint": {
      "width": 3,
      "depth": 2
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 1,
        "y": 1
      },
      {
        "x": 2,
        "y": 1
      }
    ],
    "approachAnchors": [],
    "canFlipX": true,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.9
  },
  {
    "id": "consultation_desk_honey",
    "name": "상담 책상",
    "group": "office",
    "surface": "floor",
    "footprint": {
      "width": 2,
      "depth": 2
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 1,
        "y": 1
      }
    ],
    "approachAnchors": [],
    "canFlipX": true,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.9
  },
  {
    "id": "meeting_table_round",
    "name": "회의 테이블",
    "group": "office",
    "surface": "floor",
    "footprint": {
      "width": 2,
      "depth": 2
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 1,
        "y": 1
      }
    ],
    "approachAnchors": [],
    "canFlipX": false,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.9
  },
  {
    "id": "office_sofa_sage",
    "name": "사무실 소파",
    "group": "office",
    "surface": "floor",
    "footprint": {
      "width": 3,
      "depth": 2
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 1,
        "y": 1
      },
      {
        "x": 2,
        "y": 1
      }
    ],
    "approachAnchors": [],
    "canFlipX": true,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.9
  },
  {
    "id": "low_bookshelf_honey",
    "name": "낮은 서가",
    "group": "office",
    "surface": "floor",
    "footprint": {
      "width": 2,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      }
    ],
    "approachAnchors": [],
    "canFlipX": true,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.9
  },
  {
    "id": "file_cabinet_olive",
    "name": "파일 캐비닛",
    "group": "office",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [],
    "canFlipX": true,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.9
  },
  {
    "id": "office_partition_cream",
    "name": "사무실 파티션",
    "group": "office",
    "surface": "floor",
    "footprint": {
      "width": 3,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 0
      }
    ],
    "approachAnchors": [],
    "canFlipX": true,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.9
  },
  {
    "id": "floor_lamp_warm",
    "name": "플로어 조명",
    "group": "decor",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [],
    "canFlipX": true,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.92
  },
  {
    "id": "plant_large_rubber",
    "name": "큰 잎 화분",
    "group": "decor",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [],
    "canFlipX": true,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.93
  },
  {
    "id": "plant_small_desk",
    "name": "작은 책상 화분",
    "group": "decor",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [],
    "canFlipX": true,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.9
  },
  {
    "id": "umbrella_stand_olive",
    "name": "우산꽂이",
    "group": "decor",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [],
    "canFlipX": true,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.92
  },
  {
    "id": "document_organizer_cream",
    "name": "서류 정리대",
    "group": "decor",
    "surface": "floor",
    "footprint": {
      "width": 1,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      }
    ],
    "approachAnchors": [],
    "canFlipX": true,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.9
  },
  {
    "id": "wall_clock_agency",
    "name": "공사 벽시계",
    "group": "wall",
    "surface": "wall",
    "footprint": {
      "width": 2,
      "depth": 2
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 1,
        "y": 1
      }
    ],
    "approachAnchors": [],
    "canFlipX": false,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.5
  },
  {
    "id": "bulletin_board_customer",
    "name": "고객 안내 게시판",
    "group": "wall",
    "surface": "wall",
    "footprint": {
      "width": 3,
      "depth": 2
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 1,
        "y": 1
      },
      {
        "x": 2,
        "y": 1
      }
    ],
    "approachAnchors": [],
    "canFlipX": false,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.5
  },
  {
    "id": "agency_wall_sign",
    "name": "대한냥냥공사 현판",
    "group": "wall",
    "surface": "wall",
    "footprint": {
      "width": 3,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 0
      }
    ],
    "approachAnchors": [],
    "canFlipX": false,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.5
  },
  {
    "id": "employee_award_frame",
    "name": "우수 사원 액자",
    "group": "wall",
    "surface": "wall",
    "footprint": {
      "width": 2,
      "depth": 2
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 1,
        "y": 1
      }
    ],
    "approachAnchors": [],
    "canFlipX": false,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.5
  },
  {
    "id": "wall_shelf_honey",
    "name": "벽걸이 선반",
    "group": "wall",
    "surface": "wall",
    "footprint": {
      "width": 3,
      "depth": 1
    },
    "collisionMask": [
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 0
      }
    ],
    "approachAnchors": [],
    "canFlipX": false,
    "capacity": 0,
    "behaviors": [],
    "layerMode": "standalone",
    "baselineY": 0.5
  }
];

export const FURNITURE_CATALOG: readonly CatalogFurnitureEntry[] = [
  {
    "id": "visitor_cushion_orange",
    "name": "방문자 방석",
    "group": "interactive",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [
      "use_cushion"
    ],
    "price": 0,
    "acquisition": "starter",
    "artStatus": "ready",
    "assetPath": "furniture/visitor_cushion_orange/furniture.png"
  },
  {
    "id": "service_bell_brass",
    "name": "호출벨",
    "group": "interactive",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [
      "press_bell"
    ],
    "price": 2400,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/service_bell_brass/furniture.png"
  },
  {
    "id": "swivel_chair_lavender",
    "name": "회전의자",
    "group": "interactive",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [
      "sit_swivel_chair"
    ],
    "price": 0,
    "acquisition": "starter",
    "artStatus": "ready",
    "assetPath": "furniture/swivel_chair_lavender/furniture.png"
  },
  {
    "id": "paw_stamp_pad_orange",
    "name": "발도장 패드",
    "group": "interactive",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [
      "stamp_paw"
    ],
    "price": 1800,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/paw_stamp_pad_orange/furniture.png"
  },
  {
    "id": "paper_basket_cream",
    "name": "종이 바구니",
    "group": "interactive",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [
      "hide_paper_basket"
    ],
    "price": 0,
    "acquisition": "starter",
    "artStatus": "ready",
    "assetPath": "furniture/paper_basket_cream/furniture.png"
  },
  {
    "id": "document_box_olive",
    "name": "문서 상자",
    "group": "interactive",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [
      "peek_document_box"
    ],
    "price": 1200,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/document_box_olive/furniture.png"
  },
  {
    "id": "window_bench",
    "name": "창가 벤치",
    "group": "interactive",
    "surface": "floor",
    "footprint": [
      3,
      1
    ],
    "behaviors": [
      "watch_window"
    ],
    "price": 3000,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/window_bench/furniture.png"
  },
  {
    "id": "customer_water_station",
    "name": "고객용 정수기",
    "group": "interactive",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [
      "drink_water"
    ],
    "price": 2600,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/customer_water_station/furniture.png"
  },
  {
    "id": "reception_desk_cream",
    "name": "접수 데스크",
    "group": "office",
    "surface": "floor",
    "footprint": [
      3,
      2
    ],
    "behaviors": [],
    "price": 1100,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/reception_desk_cream/furniture.png"
  },
  {
    "id": "consultation_desk_honey",
    "name": "상담 책상",
    "group": "office",
    "surface": "floor",
    "footprint": [
      2,
      2
    ],
    "behaviors": [],
    "price": 900,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/consultation_desk_honey/furniture.png"
  },
  {
    "id": "meeting_table_round",
    "name": "회의 테이블",
    "group": "office",
    "surface": "floor",
    "footprint": [
      2,
      2
    ],
    "behaviors": [],
    "price": 1200,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/meeting_table_round/furniture.png"
  },
  {
    "id": "office_sofa_sage",
    "name": "사무실 소파",
    "group": "office",
    "surface": "floor",
    "footprint": [
      3,
      2
    ],
    "behaviors": [],
    "price": 1200,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/office_sofa_sage/furniture.png"
  },
  {
    "id": "low_bookshelf_honey",
    "name": "낮은 서가",
    "group": "office",
    "surface": "floor",
    "footprint": [
      2,
      1
    ],
    "behaviors": [],
    "price": 600,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/low_bookshelf_honey/furniture.png"
  },
  {
    "id": "file_cabinet_olive",
    "name": "파일 캐비닛",
    "group": "office",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [],
    "price": 800,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/file_cabinet_olive/furniture.png"
  },
  {
    "id": "office_partition_cream",
    "name": "사무실 파티션",
    "group": "office",
    "surface": "floor",
    "footprint": [
      3,
      1
    ],
    "behaviors": [],
    "price": 500,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/office_partition_cream/furniture.png"
  },
  {
    "id": "floor_lamp_warm",
    "name": "플로어 조명",
    "group": "decor",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [],
    "price": 650,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/floor_lamp_warm/furniture.png"
  },
  {
    "id": "plant_large_rubber",
    "name": "큰 잎 화분",
    "group": "decor",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [],
    "price": 450,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/plant_large_rubber/furniture.png"
  },
  {
    "id": "plant_small_desk",
    "name": "작은 책상 화분",
    "group": "decor",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [],
    "price": 200,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/plant_small_desk/furniture.png"
  },
  {
    "id": "umbrella_stand_olive",
    "name": "우산꽂이",
    "group": "decor",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [],
    "price": 350,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/umbrella_stand_olive/furniture.png"
  },
  {
    "id": "document_organizer_cream",
    "name": "서류 정리대",
    "group": "decor",
    "surface": "floor",
    "footprint": [
      1,
      1
    ],
    "behaviors": [],
    "price": 250,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/document_organizer_cream/furniture.png"
  },
  {
    "id": "wall_clock_agency",
    "name": "공사 벽시계",
    "group": "wall",
    "surface": "wall",
    "footprint": [
      2,
      2
    ],
    "behaviors": [],
    "price": 300,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/wall_clock_agency/furniture.png"
  },
  {
    "id": "bulletin_board_customer",
    "name": "고객 안내 게시판",
    "group": "wall",
    "surface": "wall",
    "footprint": [
      3,
      2
    ],
    "behaviors": [],
    "price": 700,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/bulletin_board_customer/furniture.png"
  },
  {
    "id": "agency_wall_sign",
    "name": "대한냥냥공사 현판",
    "group": "wall",
    "surface": "wall",
    "footprint": [
      3,
      1
    ],
    "behaviors": [],
    "price": 800,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/agency_wall_sign/furniture.png"
  },
  {
    "id": "employee_award_frame",
    "name": "우수 사원 액자",
    "group": "wall",
    "surface": "wall",
    "footprint": [
      2,
      2
    ],
    "behaviors": [],
    "price": 400,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/employee_award_frame/furniture.png"
  },
  {
    "id": "wall_shelf_honey",
    "name": "벽걸이 선반",
    "group": "wall",
    "surface": "wall",
    "footprint": [
      3,
      1
    ],
    "behaviors": [],
    "price": 500,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "furniture/wall_shelf_honey/furniture.png"
  }
];

export const SURFACE_CATALOG: readonly CatalogSurfaceEntry[] = [
  {
    "id": "wallpaper_cream_plaster",
    "type": "wallpaper",
    "price": 0,
    "acquisition": "starter",
    "artStatus": "ready",
    "assetPath": "surfaces/wallpaper/wallpaper_cream_plaster.png"
  },
  {
    "id": "wallpaper_sage_linen",
    "type": "wallpaper",
    "price": 600,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "surfaces/wallpaper/wallpaper_sage_linen.png"
  },
  {
    "id": "wallpaper_apricot_pinstripe",
    "type": "wallpaper",
    "price": 700,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "surfaces/wallpaper/wallpaper_apricot_pinstripe.png"
  },
  {
    "id": "flooring_honey_oak",
    "type": "flooring",
    "price": 0,
    "acquisition": "starter",
    "artStatus": "ready",
    "assetPath": "surfaces/flooring/flooring_honey_oak.png"
  },
  {
    "id": "flooring_cream_terrazzo",
    "type": "flooring",
    "price": 1000,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "surfaces/flooring/flooring_cream_terrazzo.png"
  },
  {
    "id": "flooring_warm_gray_carpet",
    "type": "flooring",
    "price": 800,
    "acquisition": "welfarePoint",
    "artStatus": "ready",
    "assetPath": "surfaces/flooring/flooring_warm_gray_carpet.png"
  }
];
