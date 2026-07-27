import { Image, StyleSheet, View } from 'react-native';

interface CutoutCanvasProps {
  uri: string;
  /** 배경이 지워진 이미지는 투명 격자 위에 올려야 잘린 경계가 눈에 들어온다. */
  showTransparencyPattern: boolean;
}

const PATTERN_COLUMNS = 8;
const PATTERN_ROWS = 12;

export function CutoutCanvas({ uri, showTransparencyPattern }: CutoutCanvasProps) {
  return (
    <View style={styles.container}>
      {showTransparencyPattern ? <TransparencyPattern /> : null}
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />
    </View>
  );
}

function TransparencyPattern() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pattern]}>
      {Array.from({ length: PATTERN_ROWS * PATTERN_COLUMNS }, (_, index) => {
        const isDark = (Math.floor(index / PATTERN_COLUMNS) + (index % PATTERN_COLUMNS)) % 2 === 0;

        return (
          <View
            key={index}
            style={[
              styles.patternCell,
              { width: `${100 / PATTERN_COLUMNS}%`, height: `${100 / PATTERN_ROWS}%` },
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
    backgroundColor: '#141110',
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
