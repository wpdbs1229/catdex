export interface NeighborhoodLeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  profileImageUrl?: string;
  contributionScore: number;
  collectedCatCount: number;
  encounterCount: number;
  photoCount: number;
  representativeCatNames: string[];
  representativeCatImageUrls: string[];
  isMe: boolean;
}
