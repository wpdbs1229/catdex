export interface Announcement {
  id: string;
  title: string;
  body: string;
  /** 공개 시각. 목록 정렬과 '안 읽은 공지' 판정의 기준이다. */
  publishedAt: string;
  /** 중요한 공지는 목록 맨 위에 붙는다. */
  pinned: boolean;
}
