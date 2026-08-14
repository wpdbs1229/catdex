import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { nd } from '@/shared/styles/theme';

const backgroundTop = require('../../../../assets/binder/binder-background-top.png');
const backgroundMiddle = require('../../../../assets/binder/binder-background-middle.png');
const backgroundBottom = require('../../../../assets/binder/binder-background-bottom.png');
const binderPage = require('../../../../assets/binder/binder-page.png');
const ringBack = require('../../../../assets/binder/binder-ring-back.png');
const ringFront = require('../../../../assets/binder/binder-ring-front.png');
const pageCurl = require('../../../../assets/binder/page-curl.webp');

/**
 * 에셋 원본 기하. 배경 768x1632, 속지 768x1536이 같은 폭으로 맞물린다.
 * 배경은 위 480 / 가운데 64 / 아래 480으로 잘라, 화면이 길든 짧든 가죽 테두리는
 * 그대로 두고 가운데만 늘린다. 통짜로 늘리면 박음질과 모서리가 눌린다.
 */
const SLICE_RATIO = 480 / 768;
/** 위 조각에 구워진 흰 여백. 탭이 이 위에 겹쳐 앉아야 가죽에 붙어 보인다. */
export const BAKED_TOP_MARGIN_RATIO = 102 / 768;
/** 속지가 배경 위에서 차지하는 세로 구간(잘린 위/아래 조각 안에서의 위치). */
const PAGE_TOP_IN_SLICE = 48 / 480;
/** 속지 구멍 중심. 왼쪽에서의 가로 비율과, 속지 안에서의 세로 비율 여섯 개. */
const HOLE_X = 0.129;
const HOLE_YS = [0.145, 0.271, 0.396, 0.571, 0.693, 0.82];
/** 카드를 놓는 자리. 구멍보다 오른쪽에서 시작해 속지 오른쪽 끝 앞에서 멈춘다. */
const CARDS_LEFT = 0.2;
const CARDS_RIGHT = 0.93;
/**
 * 링 크기. 원본 이미지 비율(2.25)대로 걸면 종이에 붙은 길고 가는 클립처럼
 * 보여서, 폭을 줄이고 세로를 당겨 짧고 굵은 금속 링으로 만든다.
 */
const RING_WIDTH = 0.105;
const RING_ASPECT = 1.5;

interface BinderFrameProps {
  children: ReactNode;
  /** 넘길 다음 장이 있으면 오른쪽 아래 모서리가 접힌다. */
  hasNextPage?: boolean;
  onNextPage?: () => void;
  /** 떠 있는 하단바가 가리는 높이. 바인더는 그 아래까지 내려가고 모서리만 피한다. */
  bottomInset?: number;
}

/**
 * 고객 도감의 링 바인더.
 *
 * 쌓는 순서가 곧 입체감이다. 가죽 표지 → 링 뒤쪽 → 구멍 뚫린 속지 → 링 앞쪽.
 * 속지의 구멍이 실제로 뚫려 있어서, 뒤에 둔 링이 그 구멍으로 비쳐 보이고 앞쪽
 * 조각이 종이를 물고 올라온다. 이 두 겹이 "끼워져 있다"와 "얹어놨다"를 가른다.
 */
export function BinderFrame({
  children,
  hasNextPage = false,
  onNextPage,
  bottomInset = 0,
}: BinderFrameProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;

  const sliceHeight = width * SLICE_RATIO;
  const pageTop = sliceHeight * PAGE_TOP_IN_SLICE;
  const pageBottom = height - sliceHeight * PAGE_TOP_IN_SLICE;
  const pageHeight = Math.max(0, pageBottom - pageTop);

  const ringWidth = width * RING_WIDTH;
  const ringHeight = ringWidth / RING_ASPECT;

  const isMeasured = width > 0 && pageHeight > 0;

  return (
    <View
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      style={styles.binder}
    >
      {/* 가죽 표지. 위·아래 조각은 그대로 두고 가운데만 늘어난다. */}
      <View style={styles.cover}>
        <Image resizeMode="stretch" source={backgroundTop} style={{ width: '100%', height: sliceHeight }} />
        <Image resizeMode="stretch" source={backgroundMiddle} style={styles.coverMiddle} />
        <Image resizeMode="stretch" source={backgroundBottom} style={{ width: '100%', height: sliceHeight }} />
      </View>

      {isMeasured ? (
        <>
          {/* 링 뒤쪽 - 속지 구멍으로 비쳐 보인다. */}
          {HOLE_YS.map((ratio) => (
            <Image
              key={`back-${ratio}`}
              resizeMode="stretch"
              source={ringBack}
              style={[
                styles.ring,
                {
                  width: ringWidth,
                  height: ringHeight,
                  left: width * HOLE_X - ringWidth / 2,
                  top: pageTop + pageHeight * ratio - ringHeight / 2,
                },
              ]}
            />
          ))}

          <Image
            resizeMode="stretch"
            source={binderPage}
            style={[styles.page, { top: pageTop, height: pageHeight }]}
          />

          {/* 링 앞쪽 - 종이를 물고 올라온다. */}
          {HOLE_YS.map((ratio) => (
            <Image
              key={`front-${ratio}`}
              resizeMode="stretch"
              source={ringFront}
              style={[
                styles.ring,
                {
                  width: ringWidth,
                  height: ringHeight,
                  left: width * HOLE_X - ringWidth / 2,
                  top: pageTop + pageHeight * ratio - ringHeight / 2,
                },
              ]}
            />
          ))}

          <View
            style={[
              styles.cards,
              {
                left: width * CARDS_LEFT,
                width: width * (CARDS_RIGHT - CARDS_LEFT),
                top: pageTop + 8,
                bottom: Math.max(height - pageBottom + 8, bottomInset),
              },
            ]}
          >
            {children}
          </View>

          {/* 종이 말림은 늘 보인다. 다음 장이 있을 때만 눌러서 넘어간다. */}
          <Pressable
            accessibilityLabel="다음 장"
            accessibilityRole="button"
            disabled={!hasNextPage}
            onPress={onNextPage}
            style={[
              styles.curlButton,
              { right: width * (1 - CARDS_RIGHT), bottom: Math.max(height - pageBottom, bottomInset) },
            ]}
          >
            <Image source={pageCurl} style={styles.curl} />
            {hasNextPage ? (
              <ChevronRight color={nd.colors.sub} size={18} strokeWidth={2.4} style={styles.curlChevron} />
            ) : null}
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  binder: {
    flex: 1,
    overflow: 'hidden',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
  },
  coverMiddle: {
    flex: 1,
    width: '100%',
  },
  page: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  ring: {
    position: 'absolute',
  },
  cards: {
    position: 'absolute',
  },
  curlButton: {
    position: 'absolute',
    width: 56,
    height: 64,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  curl: {
    ...StyleSheet.absoluteFillObject,
    width: 56,
    height: 64,
  },
  curlChevron: {
    marginRight: 7,
    marginBottom: 9,
  },
});
