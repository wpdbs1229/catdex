import { Calendar, Lock, MapPin } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMapRegionName } from '@/features/map/map-region-label';
import { nd, theme } from '@/shared/styles/theme';
import type { Cat } from '@/shared/types/cat';
import { imageForCatType } from '@/shared/utils/catImage';

interface ClientCatSheetProps {
  cat: Cat;
  regionName: string;
  onOpenDetail: () => void;
  onStartConsult: () => void;
}

/** 발견 날짜를 "5월 10일"로. cat.lastSeenAt은 "2026.05.10" 형식이다. */
function formatSeenDate(value: string) {
  const [, month, day] = value.split('.');

  return month && day ? `${Number(month)}월 ${Number(day)}일` : value;
}

/** 개별 고객을 눌렀을 때 뜨는 카드. 시안 3번. */
export function ClientCatSheet({ cat, regionName, onOpenDetail, onStartConsult }: ClientCatSheetProps) {
  return (
    <View style={styles.sheet}>
      <View style={styles.row}>
        <Image resizeMode="cover" source={imageForCatType(cat.type, cat.imageUrl)} style={styles.photo} />

        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.name}>
            {cat.name} 고객
          </Text>

          <View style={styles.metaRow}>
            <Calendar color={nd.colors.ink} size={15} strokeWidth={1.8} />
            <Text style={styles.metaText}>최근 발견 · {formatSeenDate(cat.lastSeenAt)}</Text>
          </View>
          <View style={styles.metaRow}>
            <MapPin color={nd.colors.ink} size={15} strokeWidth={1.8} />
            <Text numberOfLines={1} style={styles.metaText}>
              {formatMapRegionName(regionName)}
            </Text>
          </View>

          <View style={styles.privacyRow}>
            <Lock color={nd.colors.subtle} size={13} strokeWidth={2} />
            <Text style={styles.privacyText}>고객 보호를 위해 위치는 구역 단위로 표시해요.</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`${cat.name} 고객 상세`}
          accessibilityRole="button"
          onPress={onOpenDetail}
          style={({ pressed }) => [styles.button, styles.buttonOutline, pressed && styles.pressed]}
        >
          <Text style={[styles.buttonLabel, styles.buttonOutlineLabel]}>고객 상세</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`${cat.name} 상담 시작`}
          accessibilityRole="button"
          onPress={onStartConsult}
          style={({ pressed }) => [styles.button, styles.buttonFilled, pressed && styles.pressed]}
        >
          <Text style={[styles.buttonLabel, styles.buttonFilledLabel]}>상담 시작</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: nd.colors.bg,
    borderTopLeftRadius: nd.radius.sheet,
    borderTopRightRadius: nd.radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  photo: {
    width: 116,
    height: 148,
    borderRadius: nd.radius.input,
    backgroundColor: nd.colors.field,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.55,
    color: nd.colors.ink,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  privacyText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    letterSpacing: -0.3,
    color: nd.colors.subtle,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: nd.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: nd.colors.bg,
  },
  buttonFilled: {
    backgroundColor: theme.colors.primary,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  buttonOutlineLabel: {
    color: theme.colors.primary,
  },
  buttonFilledLabel: {
    color: nd.colors.bg,
  },
  pressed: {
    opacity: 0.88,
  },
});
