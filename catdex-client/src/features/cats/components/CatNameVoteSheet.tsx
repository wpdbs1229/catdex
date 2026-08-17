import { Check, Vote, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchCatNameProposals, proposeCatName, voteCatName } from '@/shared/api/cats.api';
import { nd, theme } from '@/shared/styles/theme';
import type { CatNameProposal } from '@/shared/types/cat';

interface CatNameVoteSheetProps {
  visible: boolean;
  catId: string;
  catName: string;
  /** 그 고객을 만난 적 있는가. 없으면 구경만 하고 투표·제안은 못 한다. */
  canParticipate: boolean;
  onClose: () => void;
  /** 이름이 실제로 바뀌었을 수 있으니 부모가 카드를 다시 읽게 알린다. */
  onChanged: () => void;
}

/**
 * 이름 투표 시트.
 *
 * 같은 고양이를 사람마다 다르게 부르는 게 자연스럽다는 전제로, 만난 적 있는
 * 사람만 후보를 내고 표를 던진다. 도전자가 3표 이상 앞서야 실제 이름이
 * 바뀐다 - 아래 안내 문구의 "3표"는 서버 promote_leading_cat_name의
 * flip_margin과 같은 값이어야 한다.
 */
export function CatNameVoteSheet({
  visible,
  catId,
  catName,
  canParticipate,
  onClose,
  onChanged,
}: CatNameVoteSheetProps) {
  const [proposals, setProposals] = useState<CatNameProposal[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const reload = useCallback(() => {
    fetchCatNameProposals(catId)
      .then((next) => {
        setProposals(next);
        setHasLoaded(true);
      })
      .catch((error: unknown) => {
        console.warn('[cat-name-vote] load failed', error);
      });
  }, [catId]);

  useEffect(() => {
    if (visible) {
      setHasLoaded(false);
      reload();
    }
  }, [visible, reload]);

  const handleVote = (proposal: CatNameProposal) => {
    if (proposal.isMyVote || isBusy) {
      return;
    }

    setIsBusy(true);

    voteCatName(proposal.id)
      .then(() => {
        reload();
        onChanged();
      })
      .catch((error: unknown) => {
        console.warn('[cat-name-vote] vote failed', error);
        Alert.alert('투표하지 못했어요', '잠시 후 다시 시도해 주세요.');
      })
      .finally(() => setIsBusy(false));
  };

  const handlePropose = () => {
    const cleaned = draftName.trim();

    if (!cleaned || isBusy) {
      return;
    }

    setIsBusy(true);

    proposeCatName(catId, cleaned)
      .then(() => {
        setDraftName('');
        reload();
        onChanged();
      })
      .catch((error: unknown) => {
        console.warn('[cat-name-vote] propose failed', error);
        Alert.alert('제안하지 못했어요', '잠시 후 다시 시도해 주세요.');
      })
      .finally(() => setIsBusy(false));
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="닫기" onPress={onClose} style={styles.backdropTouch} />

        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.head}>
            <View style={styles.headTexts}>
              <Text style={styles.title}>이름 투표</Text>
              <Text style={styles.subtitle}>지금 이름은 {catName}이에요</Text>
            </View>
            <Pressable
              accessibilityLabel="닫기"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <X color={nd.colors.sub} size={20} strokeWidth={2} />
            </Pressable>
          </View>

          {!canParticipate ? (
            <Text style={styles.notice}>이 고객을 만나야 이름을 제안하고 투표할 수 있어요.</Text>
          ) : (
            <Text style={styles.notice}>지금 이름보다 3표 앞서면 이름이 바뀐다냥!</Text>
          )}

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {!hasLoaded ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loading} />
            ) : (
              proposals.map((proposal) => (
                <Pressable
                  accessibilityLabel={`${proposal.name}에 투표, ${proposal.votes}표`}
                  accessibilityRole="button"
                  disabled={!canParticipate || proposal.isMyVote}
                  key={proposal.id}
                  onPress={() => handleVote(proposal)}
                  style={({ pressed }) => [
                    styles.row,
                    proposal.isMyVote && styles.rowMine,
                    pressed && canParticipate && !proposal.isMyVote && styles.pressed,
                  ]}
                >
                  <View style={styles.rowText}>
                    <View style={styles.rowNameLine}>
                      <Text style={[styles.rowName, proposal.isMyVote && styles.rowNameMine]}>
                        {proposal.name}
                      </Text>
                      {proposal.isActive ? <Text style={styles.activeBadge}>현재 이름</Text> : null}
                    </View>
                    <Text style={styles.rowVotes}>{proposal.votes}표</Text>
                  </View>
                  {proposal.isMyVote ? <Check color={theme.colors.primary} size={18} strokeWidth={2.6} /> : null}
                </Pressable>
              ))
            )}

            {canParticipate ? (
              <View style={styles.proposeRow}>
                <TextInput
                  editable={!isBusy}
                  maxLength={20}
                  onChangeText={setDraftName}
                  onSubmitEditing={handlePropose}
                  placeholder="새 이름 제안하기"
                  placeholderTextColor={nd.colors.sub}
                  returnKeyType="done"
                  style={styles.proposeInput}
                  value={draftName}
                />
                <Pressable
                  accessibilityLabel="이름 제안"
                  accessibilityRole="button"
                  disabled={!draftName.trim() || isBusy}
                  onPress={handlePropose}
                  style={({ pressed }) => [
                    styles.proposeButton,
                    (!draftName.trim() || isBusy) && styles.proposeButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Vote color="#FFFFFF" size={16} strokeWidth={2.2} />
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 17, 17, 0.4)',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: nd.radius.sheet,
    borderTopRightRadius: nd.radius.sheet,
    backgroundColor: nd.colors.bg,
  },
  handle: {
    width: 40,
    height: 4,
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 2,
    backgroundColor: nd.colors.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  headTexts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.48,
    color: nd.colors.ink,
  },
  subtitle: {
    fontSize: 13,
    letterSpacing: -0.32,
    color: nd.colors.sub,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingBottom: 10,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    color: nd.colors.sub,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  loading: {
    paddingVertical: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: nd.colors.bgSecondary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowMine: {
    backgroundColor: theme.colors.primarySoft,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: nd.colors.ink,
  },
  rowNameMine: {
    color: theme.colors.primary,
  },
  activeBadge: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: -0.25,
    color: nd.colors.sub,
  },
  rowVotes: {
    fontSize: 12.5,
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  pressed: {
    opacity: 0.8,
  },
  proposeRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proposeInput: {
    flex: 1,
    minWidth: 0,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: nd.colors.bg,
    paddingHorizontal: 14,
    fontSize: 14,
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  proposeButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  proposeButtonDisabled: {
    backgroundColor: nd.colors.subtle,
  },
});
