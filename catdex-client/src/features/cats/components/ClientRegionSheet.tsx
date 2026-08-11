import { Lock } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMapRegionName } from '@/features/map/map-region-label';
import { nd, theme } from '@/shared/styles/theme';
import type { Cat } from '@/shared/types/cat';
import type { Region } from '@/shared/types/region';
import { imageForCatType } from '@/shared/utils/catImage';

interface ClientRegionSheetProps {
  region: Region;
  cats: Cat[];
  onSeeNearby: () => void;
}

/** 구역 마커를 눌렀을 때 뜨는 시트. 시안 2번. */
export function ClientRegionSheet({ region, cats, onSeeNearby }: ClientRegionSheetProps) {
  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />

      <Text style={styles.title}>{formatMapRegionName(region.name)}</Text>
      <Text style={styles.summary}>이 구역에서 고객 {cats.length}마리가 발견됐어요.</Text>

      <ScrollView
        contentContainerStyle={styles.catRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {cats.map((cat) => (
          <View key={cat.id} style={styles.catSlot}>
            <Image resizeMode="contain" source={imageForCatType(cat.type, cat.imageUrl)} style={styles.catImage} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.privacyRow}>
        <Lock color={nd.colors.subtle} size={14} strokeWidth={2} />
        <Text style={styles.privacyText}>고객 안전을 위해 정확한 위치 대신 구역만 표시해요.</Text>
      </View>

      <Pressable
        accessibilityLabel="근처 고객 보기"
        accessibilityRole="button"
        onPress={onSeeNearby}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaLabel}>근처 고객 보기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: nd.colors.bg,
    borderTopLeftRadius: nd.radius.sheet,
    borderTopRightRadius: nd.radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: nd.colors.border,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: nd.colors.ink,
  },
  summary: {
    fontSize: 15,
    letterSpacing: -0.38,
    color: nd.colors.sub,
  },
  catRow: {
    gap: 12,
    paddingVertical: 4,
  },
  catSlot: {
    width: 96,
    height: 116,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  catImage: {
    width: '100%',
    height: '100%',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    letterSpacing: -0.33,
    color: nd.colors.subtle,
  },
  cta: {
    height: 56,
    borderRadius: nd.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  pressed: {
    opacity: 0.88,
  },
  ctaLabel: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.43,
    color: nd.colors.bg,
  },
});
