import type { LucideIcon } from 'lucide-react-native';
import { Bell, ChevronLeft, Clock, PawPrint, Share2 } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { createShadow, theme } from '@/shared/styles/theme';
import type { NotificationPermissionState, NotificationSettings } from '@/shared/types/notification';

interface NotificationSettingsScreenProps {
  permissionState: NotificationPermissionState;
  settings: NotificationSettings;
  isSaving: boolean;
  onBack: () => void;
  onChangeSettings: (settings: NotificationSettings) => void;
  onRequestPermission: () => void;
  onSendPreview: () => void;
}

const reminderTimes = ['18:00', '20:00', '21:30'];

export function NotificationSettingsScreen({
  permissionState,
  settings,
  isSaving,
  onBack,
  onChangeSettings,
  onRequestPermission,
  onSendPreview,
}: NotificationSettingsScreenProps) {
  const canUseNotifications = permissionState === 'granted';

  const updateSetting = (nextSettings: Partial<NotificationSettings>) => {
    onChangeSettings({
      ...settings,
      ...nextSettings,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={theme.colors.primaryDark} size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>알림 설정</Text>
          <Text style={styles.subtitle}>탐험 리마인더와 새 공유 고양이 알림을 관리해요.</Text>
        </View>
      </View>

      <View style={styles.permissionCard}>
        <View style={styles.permissionIcon}>
          <Bell color={theme.colors.primaryDark} size={22} />
        </View>
        <View style={styles.permissionCopy}>
          <Text style={styles.permissionTitle}>{canUseNotifications ? '알림 권한이 켜져 있어요' : '알림 권한이 필요해요'}</Text>
          <Text style={styles.permissionText}>
            {permissionState === 'denied'
              ? '기기 설정에서 냥도감 알림을 허용하면 리마인더를 받을 수 있어요.'
              : '탐험 시간과 도감 활동을 놓치지 않도록 알림을 허용해주세요.'}
          </Text>
        </View>
        {!canUseNotifications ? (
          <Pressable disabled={isSaving || permissionState === 'denied'} onPress={onRequestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>허용</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.section}>
        <NotificationToggle
          description="선택한 시간에 오늘의 고양이 기록을 떠올려줘요."
          disabled={!canUseNotifications || isSaving}
          icon={Clock}
          label="탐험 리마인더"
          onValueChange={(value) => updateSetting({ dailyReminderEnabled: value })}
          value={settings.dailyReminderEnabled}
        />

        <View style={[styles.timePanel, (!canUseNotifications || !settings.dailyReminderEnabled) && styles.disabledPanel]}>
          <Text style={styles.timeTitle}>리마인더 시간</Text>
          <View style={styles.timeRow}>
            {reminderTimes.map((time) => {
              const isSelected = settings.dailyReminderTime === time;

              return (
                <Pressable
                  disabled={!canUseNotifications || !settings.dailyReminderEnabled || isSaving}
                  key={time}
                  onPress={() => updateSetting({ dailyReminderTime: time })}
                  style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                >
                  <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>{time}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <NotificationToggle
          description="내 동네에 새 공유 고양이가 등록되면 알려줘요. 서버 푸시 연동 후 발송돼요."
          disabled={isSaving}
          icon={Share2}
          label="새 공유 고양이"
          onValueChange={(value) => updateSetting({ sharedCatEnabled: value })}
          value={settings.sharedCatEnabled}
        />
      </View>

      <View style={styles.previewCard}>
        <PawPrint color={theme.colors.accent} size={20} />
        <Text style={styles.previewText}>미리보기는 즉시 로컬 알림을 보내 권한과 표시 동작을 확인해요.</Text>
        <Button disabled={!canUseNotifications || isSaving} onPress={onSendPreview} variant="secondary">
          미리보기 보내기
        </Button>
      </View>
    </ScrollView>
  );
}

interface NotificationToggleProps {
  description: string;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}

function NotificationToggle({ description, disabled = false, icon: Icon, label, onValueChange, value }: NotificationToggleProps) {
  return (
    <View style={[styles.toggleCard, disabled && styles.disabledPanel]}>
      <View style={styles.toggleIcon}>
        <Icon color={theme.colors.primaryDark} size={19} />
      </View>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        disabled={disabled}
        ios_backgroundColor="#E8D3B7"
        onValueChange={onValueChange}
        thumbColor={value ? '#FFFDF6' : '#F8EAD2'}
        trackColor={{ false: '#E8D3B7', true: theme.colors.accent }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.82)',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.mutedText,
  },
  permissionCard: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,253,246,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.88)',
    ...createShadow(7),
  },
  permissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  permissionCopy: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  permissionText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.mutedText,
  },
  permissionButton: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.primaryDark,
  },
  permissionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF8F0',
  },
  section: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  toggleCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,253,246,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.86)',
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  toggleDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.mutedText,
  },
  timePanel: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(221,229,200,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(139,160,112,0.22)',
  },
  timeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  timeRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  timeChip: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,253,246,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(232,211,183,0.82)',
  },
  timeChipSelected: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  timeChipTextSelected: {
    color: '#FFF8F0',
  },
  previewCard: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: '#FFF0DC',
    borderWidth: 1,
    borderColor: 'rgba(201,121,73,0.22)',
  },
  previewText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  disabledPanel: {
    opacity: 0.58,
  },
});
