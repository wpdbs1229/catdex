import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Card } from '@/shared/components/Card';
import type { CatEncounter } from '@/shared/types/cat';
import { formatDisplayDate } from '@/shared/utils/catPresentation';
import { theme } from '@/shared/styles/theme';

interface EncounterTimelineProps {
  encounters: CatEncounter[];
  currentUserId?: string | null;
  onRemoveEncounter?: (encounter: CatEncounter) => void;
}

export function EncounterTimeline({ encounters, currentUserId, onRemoveEncounter }: EncounterTimelineProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>사진 기록 타임라인</Text>
      <View style={styles.list}>
        {encounters.map((encounter, index) => {
          const isMine = Boolean(currentUserId && encounter.userId === currentUserId);

          return (
            <View key={encounter.id} style={styles.item}>
              <View style={styles.markerColumn}>
                <View style={[styles.dot, isMine && styles.dotMine]} />
                {index !== encounters.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={styles.textWrap}>
                <View style={styles.rowTop}>
                  <Text style={styles.date}>
                    {formatDisplayDate(encounter.seenAt)}
                    {isMine ? <Text style={styles.mineBadge}>{'  '}내 기록</Text> : null}
                  </Text>
                  {isMine && onRemoveEncounter ? (
                    <Pressable
                      accessibilityLabel={`${formatDisplayDate(encounter.seenAt)} 만남 기록 분리`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => onRemoveEncounter(encounter)}
                      style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                    >
                      <Trash2 color={theme.colors.mutedText} size={13} />
                      <Text style={styles.removeText}>분리</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.memo}>{encounter.memo}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.lg,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6956',
  },
  list: {
    marginTop: theme.spacing.lg,
  },
  item: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  markerColumn: {
    alignItems: 'center',
    width: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: '#B97448',
  },
  dotMine: {
    backgroundColor: theme.colors.accent,
  },
  line: {
    width: 1,
    flex: 1,
    marginVertical: 6,
    backgroundColor: '#EAD7C0',
  },
  textWrap: {
    flex: 1,
    paddingBottom: theme.spacing.lg,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  date: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  mineBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(139, 112, 83, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  removeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.mutedText,
  },
  memo: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.mutedText,
  },
  pressed: {
    opacity: 0.8,
  },
});
