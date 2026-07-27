import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { reportContent } from './accountSafety';

export type ReportableTarget = 'release' | 'beat' | 'post' | 'profile' | 'comment' | 'blog_post' | 'story';

const REASONS = [
  { label: 'Inappropriate content', value: 'inappropriate_content' },
  { label: 'Spam or scam', value: 'spam' },
  { label: 'Harassment', value: 'harassment' },
  { label: 'Hate speech', value: 'hate_speech' },
  { label: 'Violence or threat', value: 'violence' },
  { label: 'Copyright infringement', value: 'copyright_infringement' },
  { label: 'Something else', value: 'other' },
] as const;

type ReportActionInput = {
  targetType: ReportableTarget;
  targetId: string;
  label: string;
  details?: string;
  onReported?: () => void;
};

async function submit(input: ReportActionInput, reason: (typeof REASONS)[number]) {
  try {
    const result = await reportContent({
      targetType: input.targetType,
      targetId: input.targetId,
      reason: reason.value,
      details: input.details,
    });
    Alert.alert(
      result.duplicate ? 'Already reported' : 'Report received',
      result.duplicate
        ? 'This item is already in the moderation queue. You do not need to report it again.'
        : 'Thank you. PLUGGD will review it against the Community Guidelines.',
    );
    input.onReported?.();
  } catch (error: any) {
    Alert.alert(
      'Report unavailable',
      `${error?.message ?? 'Please try again.'}\n\nFor urgent safety concerns, contact support@pluggd.fm.`,
    );
  }
}

export function showReportActions(input: ReportActionInput) {
  const title = `Report ${input.label}`;
  const message = 'Choose the reason that best describes the issue.';

  if (Platform.OS === 'ios') {
    const options = [...REASONS.map((reason) => reason.label), 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: REASONS.map((_, index) => index),
        userInterfaceStyle: 'dark',
      },
      (index) => {
        const reason = REASONS[index];
        if (reason) void submit(input, reason);
      },
    );
    return;
  }

  Alert.alert(title, message, [
    ...REASONS.map((reason) => ({
      text: reason.label,
      onPress: () => void submit(input, reason),
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
