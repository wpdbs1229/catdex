import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import type { CatEncounter } from '@/shared/types/cat';
import { formatDisplayDate } from '@/shared/utils/catPresentation';
import { theme } from '@/shared/styles/theme';

interface EncounterTimelineProps {
  encounters: CatEncounter[];
}

export function EncounterTimeline({ encounters }: EncounterTimelineProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>사진 기록 타임라인</Text>
      <View style={styles.list}>
        {encounters.map((encounter, index) => (
          <View key={encounter.id} style={styles.item}>
            <View style={styles.markerColumn}>
              <View style={styles.dot} />
              {index !== encounters.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.date}>{formatDisplayDate(encounter.seenAt)}</Text>
              <Text style={styles.memo}>{encounter.memo}</Text>
            </View>
          </View>
        ))}
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
  date: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  memo: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.mutedText,
  },
});
