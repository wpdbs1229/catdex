type ErrorContext =
  | 'auth.login'
  | 'account.withdraw'
  | 'community.load'
  | 'community.save'
  | 'community.update'
  | 'community.delete'
  | 'community.comment'
  | 'community.like'
  | 'leaderboard.load'
  | 'capture.process'
  | 'cat.update'
  | 'profile.save'
  | 'notification.save'
  | 'notification.load'
  | 'neighborhood.detect'
  | 'generic';

export interface UserFacingError {
  title: string;
  message: string;
}

const contextFallbacks: Record<ErrorContext, UserFacingError> = {
  'auth.login': {
    title: '로그인이 완료되지 않았어요',
    message: '잠시 후 다시 시도하거나 다른 시작 방법을 선택해 주세요.',
  },
  'account.withdraw': {
    title: '회원탈퇴를 완료하지 못했어요',
    message: '계정 상태를 확인한 뒤 잠시 후 다시 시도해 주세요.',
  },
  'community.load': {
    title: '동네 이야기를 불러오지 못했어요',
    message: '잠시 후 다시 시도해 주세요. 작성된 글은 사라지지 않아요.',
  },
  'community.save': {
    title: '이야기를 올리지 못했어요',
    message: '내용은 그대로 두었어요. 연결 상태를 확인한 뒤 다시 올려 주세요.',
  },
  'community.update': {
    title: '게시글을 수정하지 못했어요',
    message: '내용은 그대로 두었어요. 연결 상태를 확인한 뒤 다시 저장해 주세요.',
  },
  'community.delete': {
    title: '게시글을 삭제하지 못했어요',
    message: '권한과 연결 상태를 확인한 뒤 다시 시도해 주세요.',
  },
  'community.comment': {
    title: '댓글을 남기지 못했어요',
    message: '내용은 그대로 두었어요. 잠시 후 다시 보내 주세요.',
  },
  'community.like': {
    title: '공감을 반영하지 못했어요',
    message: '화면을 다시 불러와 최신 상태로 맞춰볼게요.',
  },
  'leaderboard.load': {
    title: '랭킹을 불러오지 못했어요',
    message: '잠시 후 다시 시도해 주세요. 기록은 그대로 남아 있어요.',
  },
  'capture.process': {
    title: '사진을 처리하지 못했어요',
    message: '사진은 아직 저장되지 않았어요. 고양이가 더 잘 보이게 다시 찍어 주세요.',
  },
  'cat.update': {
    title: '고양이 정보를 저장하지 못했어요',
    message: '입력한 내용은 유지돼요. 잠시 후 다시 저장해 주세요.',
  },
  'profile.save': {
    title: '프로필을 저장하지 못했어요',
    message: '입력한 내용은 유지돼요. 잠시 후 다시 저장해 주세요.',
  },
  'notification.save': {
    title: '알림 설정을 저장하지 못했어요',
    message: '지금 설정은 바뀌지 않았어요. 잠시 후 다시 시도해 주세요.',
  },
  'notification.load': {
    title: '알림을 불러오지 못했어요',
    message: '알림 내역을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.',
  },
  'neighborhood.detect': {
    title: '현재 동네를 확인하지 못했어요',
    message: '현재 위치의 행정동을 찾지 못했어요. 위치 권한과 인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
  },
  generic: {
    title: '잠시 문제가 생겼어요',
    message: '조금 뒤에 다시 시도해 주세요.',
  },
};

function getRawMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? '');
}

function matches(rawMessage: string, patterns: string[]) {
  const normalized = rawMessage.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

function isUserInputError(rawMessage: string) {
  return matches(rawMessage, ['닉네임은', '댓글을 입력', '2자 이상', '프로필 수정에는 로그인']);
}

export function getUserFacingError(error: unknown, context: ErrorContext = 'generic'): UserFacingError {
  const rawMessage = getRawMessage(error).trim();

  if (!rawMessage) {
    return contextFallbacks[context];
  }

  if (isUserInputError(rawMessage)) {
    return {
      title: '입력 내용을 확인해 주세요',
      message: rawMessage,
    };
  }

  if (matches(rawMessage, ['cancelled', 'canceled', 'oauth login was cancelled'])) {
    return {
      title: '로그인이 취소됐어요',
      message: '필요할 때 다시 시작할 수 있어요.',
    };
  }

  if (matches(rawMessage, ['사원증'])) {
    return {
      title: '사원증이 필요해요',
      message: '카카오나 Google로 사원증을 받으면 동네 이야기에 참여할 수 있어요.',
    };
  }

  if (matches(rawMessage, ['network', 'fetch', 'internet', 'timeout', 'failed to fetch', 'request failed'])) {
    return {
      title: '연결이 불안정해요',
      message: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
    };
  }

  if (matches(rawMessage, ['jwt', 'session', 'invalid login', 'invalid credentials', 'not authenticated', '로그인'])) {
    return {
      title: '로그인이 필요해요',
      message: '다시 로그인하면 이어서 진행할 수 있어요.',
    };
  }

  if (matches(rawMessage, ['permission', 'policy', 'rls', '403', '401', 'unauthorized', 'forbidden', '권한'])) {
    return {
      title: '권한 확인이 필요해요',
      message: '다시 로그인한 뒤 시도해 주세요.',
    };
  }

  if (matches(rawMessage, ['storage', 'upload', '이미지', 'image'])) {
    return {
      title: '사진을 저장하지 못했어요',
      message: '사진은 기기 안에 있어요. 잠시 후 다시 시도해 주세요.',
    };
  }

  if (matches(rawMessage, ['500', '503', 'database', 'postgres', 'postgrest', 'supabase'])) {
    return {
      title: '일시적으로 처리하지 못했어요',
      message: '일시적인 문제일 수 있어요. 잠시 후 다시 시도해 주세요.',
    };
  }

  return contextFallbacks[context];
}

export function getUserFacingErrorMessage(error: unknown, context: ErrorContext = 'generic') {
  return getUserFacingError(error, context).message;
}
