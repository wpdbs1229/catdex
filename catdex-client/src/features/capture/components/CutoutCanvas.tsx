import { useMemo, useState } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

interface CutoutCanvasProps {
  uri: string;
  /** 이미지 자체의 가로/세로 비율. 있으면 그 비율의 상자만큼만 격자를 깐다. */
  aspectRatio?: number;
  /** 배경이 지워진 이미지는 투명 격자 위에 올려야 잘린 경계가 눈에 들어온다. */
  showTransparencyPattern: boolean;
}

const PATTERN_CELL_SIZE = 24;

export function CutoutCanvas({ uri, aspectRatio, showTransparencyPattern }: CutoutCanvasProps) {
  const [bounds, setBounds] = useState({ width: 0, height: 0 });

  // 격자를 화면 전체에 깔면 레터박스 여백까지 투명한 것처럼 보여서, 누끼가
  // 실패했는지 성공했는지 눈으로 구분할 수 없다. 이미지가 실제로 그려지는
  // 상자를 계산해 그 안에만 격자를 깐다.
  const frame = useMemo(() => {
    if (!aspectRatio || !bounds.width || !bounds.height) {
      return null;
    }

    const heightIfFullWidth = bounds.width / aspectRatio;

    return heightIfFullWidth <= bounds.height
      ? { width: bounds.width, height: heightIfFullWidth }
      : { width: bounds.height * aspectRatio, height: bounds.height };
  }, [aspectRatio, bounds]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBounds({ width, height });
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={frame ?? styles.fill}>
        {showTransparencyPattern && frame ? <TransparencyPattern {...frame} /> : null}
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </View>
    </View>
  );
}

function TransparencyPattern({ width, height }: { width: number; height: number }) {
  const columns = Math.max(1, Math.ceil(width / PATTERN_CELL_SIZE));
  const rows = Math.max(1, Math.ceil(height / PATTERN_CELL_SIZE));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pattern]}>
      {Array.from({ length: rows * columns }, (_, index) => {
        const isDark = (Math.floor(index / columns) + (index % columns)) % 2 === 0;

        return (
          <View
            key={index}
            style={[
              styles.patternCell,
              { width: width / columns, height: height / rows },
              isDark && styles.patternCellDark,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141110',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pattern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  patternCell: {
    backgroundColor: '#1D1917',
  },
  patternCellDark: {
    backgroundColor: '#262120',
  },
});
