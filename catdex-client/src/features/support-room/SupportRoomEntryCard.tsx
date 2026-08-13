import { ChevronRight } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CAT_IDLE_IMAGES,
  SUPPORT_ROOM_HOME_PREVIEW,
} from '@/features/support-room/support-room.assets';
import type { RoomState } from '@/features/support-room/support-room.domain';
import { nd } from '@/shared/styles/theme';

interface SupportRoomEntryCardProps {
  room: RoomState | null;
  onPress: () => void;
}

/** 카드에 세우는 고양이 수. 더 넣으면 방이 좁아 보인다. */
const MAX_PREVIEW_CATS = 3;

interface EntryContent {
  badge: string | null;
  title: string;
  subtitle: string;
}

/**
 * 상태에 따라 문구와 배지만 바꾼다.
 *
 * 시안이 다섯 가지였지만 모듈 구조는 하나로 둔다. 상태마다 다른 카드를 쓰면
 * 사용자가 매번 새 화면을 읽어야 하고, CTA 문구까지 바뀌면 학습이 리셋된다.
 * 우선순위는 급한 것부터다 - 벨 요청 > 안 읽은 기록 > 방문 중 > 빈 방.
 */
function describe(room: RoomState | null): EntryContent {
  const scenes = room?.pendingScenes ?? [];
  const bell = scenes.filter((scene) => scene.behaviorId === 'press_bell');
  const unread = room?.records.filter((record) => record.status === 'unread').length ?? 0;
  const names = scenes.map((scene) => scene.catNameSnapshot);

  if (bell.length > 0) {
    return {
      badge: `호출 ${bell.length}`,
      title: '고객님이 호출벨을 눌렀어요',
      subtitle: `${bell[0].catNameSnapshot} 고객님이 응대를 기다리고 있어요`,
    };
  }

  if (unread > 0) {
    return {
      badge: `새 기록 ${unread}`,
      title: '새 상담 기록이 도착했어요',
      subtitle: `아직 확인하지 않은 기록이 ${unread}건 있어요`,
    };
  }

  if (scenes.length > 0) {
    return {
      badge: `새 장면 ${scenes.length}`,
      title: '고객지원실에 새 장면이 생겼어요',
      subtitle:
        names.length === 1
          ? `${names[0]} 고객님이 기다리고 있어요`
          : `${names.slice(0, 2).join('와 ')} 고객님이 기다리고 있어요`,
    };
  }

  return {
    badge: null,
    title: '고객지원실이 조용해요',
    subtitle: '잠시 뒤에 고객님이 찾아올 거예요',
  };
}

/**
 * 홈의 고객지원실 진입 모듈.
 *
 * 고양이 사진 카드를 여러 장 늘어놓는 대신 가로형 모듈 하나만 둔다. 사진보다
 * 게임 속 캐릭터와 공간을 먼저 보여 줘야 무엇을 하는 곳인지 바로 읽힌다.
 * 배지도 CTA도 하나씩이다.
 */
export function SupportRoomEntryCard({ room, onPress }: SupportRoomEntryCardProps) {
  const content = describe(room);
  const scenes = (room?.pendingScenes ?? []).slice(0, MAX_PREVIEW_CATS);

  return (
    <Pressable
      accessibilityLabel={`${content.title}. ${content.subtitle}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.previewBox}>
        <Image resizeMode="cover" source={SUPPORT_ROOM_HOME_PREVIEW} style={styles.preview} />

        {/* 실제로 방문 중인 고양이를 그대로 세운다. 미리 그려 둔 그림이 아니다. */}
        <View pointerEvents="none" style={styles.catRow}>
          {scenes.map((scene) => (
            <Image
              key={scene.id}
              resizeMode="contain"
              source={CAT_IDLE_IMAGES[scene.characterAssetKeySnapshot]}
              style={styles.cat}
            />
          ))}
        </View>

        {content.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{content.badge}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{content.title}</Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {content.subtitle}
        </Text>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>고객지원실 들어가기</Text>
        <ChevronRight color="#FFFFFF" size={17} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: nd.colors.bgSecondary,
    overflow: 'hidden',
  },
  previewBox: {
    height: 107,
    justifyContent: 'flex-end',
  },
  preview: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 6,
  },
  cat: {
    width: 58,
    height: 58,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: nd.radius.pill,
    backgroundColor: nd.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.28,
    color: '#FFFFFF',
  },
  body: {
    gap: 3,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  subtitle: {
    fontSize: 13,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    margin: 16,
    borderRadius: 12,
    backgroundColor: nd.colors.accent,
    paddingVertical: 13,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.38,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
