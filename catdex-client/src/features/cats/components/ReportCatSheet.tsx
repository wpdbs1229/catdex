import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { reportCat } from '@/shared/api/cats.api';
import { getUserFacingError } from '@/shared/errors/user-facing-error';
import { createNdShadow, nd, theme } from '@/shared/styles/theme';
import type { CatReportReason } from '@/shared/types/cat';

/**
 * 신고 사유. 값은 서버(reports.reason)에 이미 쓰이는 영문 id고 한국어는
 * 여기서만 붙는다.
 *
 * 순서는 실제로 일어날 법한 순이다. 같은 고양이가 두 번 등록되는 일이 가장
 * 흔하고, '기타'는 어디에도 안 맞을 때의 출구라 맨 뒤에 둔다.
 */
const REPORT_REASONS: Array<{ id: CatReportReason; label: string; hint: string }> = [
  { id: 'duplicate_cat', label: '중복 등록', hint: '이미 도감에 있는 고양이예요' },
  { id: 'incorrect_info', label: '정보가 틀려요', hint: '이름·털색·거처가 실제와 달라요' },
  { id: 'inappropriate_photo', label: '부적절한 사진', hint: '고양이가 아니거나 불쾌한 사진이에요' },
  { id: 'location_risk', label: '위치 노출 위험', hint: '학대 우려 등 위치가 알려지면 위험해요' },
  { id: 'other', label: '기타', hint: '직접 적어주세요' },
];

interface ReportCatSheetProps {
  visible: boolean;
  catId: string;
  catName: string;
  onClose: () => void;
}

/**
 * 고객 카드 신고 시트.
 *
 * 다른 사용자가 올린 사진·이름·메모가 함께 보이는 화면이라 신고가 여기 있어야
 * 한다. 사유 하나를 고르면 바로 보낼 수 있고, '기타'만 설명을 요구한다 -
 * 정해진 사유는 라벨만으로 충분하지만 기타는 내용이 없으면 아무것도 아니다.
 */
export function ReportCatSheet({ visible, catId, catName, onClose }: ReportCatSheetProps) {
  const [reason, setReason] = useState<CatReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsDetail = reason === 'other' && detail.trim().length === 0;
  const canSubmit = reason !== null && !needsDetail && !isSubmitting;

  const resetAndClose = () => {
    setReason(null);
    setDetail('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason || !canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      await reportCat({ catId, reason, memo: detail.trim() });
      resetAndClose();
      // 시트가 닫힌 다음에 떠야 알림이 시트 뒤에 가려지지 않는다.
      Alert.alert('신고가 접수됐어요', '확인 후 조치할게요. 알려주셔서 고마워요.');
    } catch (error) {
      Alert.alert('신고를 보내지 못했어요', getUserFacingError(error, 'generic').message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={resetAndClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="신고 닫기" onPress={resetAndClose} style={styles.scrim} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{catName} 카드 신고</Text>
              <Pressable accessibilityLabel="닫기" hitSlop={8} onPress={resetAndClose}>
                <X color={nd.colors.sub} size={22} strokeWidth={2} />
              </Pressable>
            </View>

            <View style={styles.reasonList}>
              {REPORT_REASONS.map((option) => {
                const isSelected = reason === option.id;

                return (
                  <Pressable
                    accessibilityLabel={option.label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    disabled={isSubmitting}
                    key={option.id}
                    onPress={() => setReason(option.id)}
                    style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                  >
                    <View style={styles.reasonTexts}>
                      <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}>
                        {option.label}
                      </Text>
                      <Text style={styles.reasonHint}>{option.hint}</Text>
                    </View>
                    {isSelected ? (
                      <Check color={theme.colors.primary} size={19} strokeWidth={2.6} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              editable={!isSubmitting}
              maxLength={300}
              multiline
              onChangeText={setDetail}
              placeholder={
                reason === 'other' ? '어떤 문제인지 적어주세요 (필수)' : '자세한 내용이 있으면 적어주세요 (선택)'
              }
              placeholderTextColor={nd.colors.sub}
              style={styles.detailInput}
              value={detail}
            />

            <Pressable
              accessibilityLabel="신고 보내기"
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submit,
                !canSubmit && styles.submitDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.submitLabel}>{isSubmitting ? '보내는 중...' : '신고 보내기'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: nd.colors.scrim,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    ...createNdShadow(0.15, 16),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flexShrink: 1,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  reasonList: {
    marginTop: 14,
    gap: 7,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: '#FFFFFF',
  },
  reasonRowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  reasonTexts: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.38,
    color: nd.colors.ink,
  },
  reasonLabelSelected: {
    color: theme.colors.primary,
  },
  reasonHint: {
    fontSize: 12.5,
    letterSpacing: -0.3,
    color: nd.colors.sub,
  },
  detailInput: {
    marginTop: 12,
    minHeight: 76,
    maxHeight: 140,
    padding: 13,
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    fontSize: 14,
    letterSpacing: -0.35,
    color: nd.colors.ink,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: nd.radius.input,
    backgroundColor: theme.colors.primary,
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
