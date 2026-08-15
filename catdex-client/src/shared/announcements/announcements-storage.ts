import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/shared/api/auth.api';

const STORAGE_KEY = 'catdex.announcements.lastSeen.v1';

/**
 * 공지함을 마지막으로 연 시각만 남긴다.
 *
 * 공지별 읽음 표시를 서버에 두면 테이블이 하나 더 늘고, 정작 얻는 건 "이건
 * 읽었고 저건 안 읽었다"뿐이다. 공지는 목록을 한 번 열면 다 훑는 성격이라
 * 시각 하나로 충분하다. 기기를 바꾸면 배지가 다시 뜨지만 그 정도는 잃어도 된다.
 *
 * 같은 기기에서 계정을 바꿔도 앞 사용자의 기록이 남지 않게 즐겨찾기와 같은
 * 방식으로 사용자별 키를 쓴다.
 */
async function getStorageKey() {
  const userId = await getCurrentUserId();

  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

export async function loadAnnouncementsLastSeen(): Promise<string | null> {
  return AsyncStorage.getItem(await getStorageKey());
}

export async function markAnnouncementsSeen(latestPublishedAt: string): Promise<void> {
  await AsyncStorage.setItem(await getStorageKey(), latestPublishedAt);
}

/** 마지막으로 본 뒤에 올라온 공지가 있는지. */
export function hasUnreadAnnouncement(latestPublishedAt: string | undefined, lastSeen: string | null) {
  if (!latestPublishedAt) {
    return false;
  }

  // 한 번도 연 적 없으면 열린 공지가 있다는 것만으로 알린다.
  return !lastSeen || latestPublishedAt > lastSeen;
}
