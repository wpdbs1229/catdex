export interface Badge {
  id: string;
  name: string;
  description: string;
  achieved: boolean;
  achievedAt?: string;
}

export interface ExplorerProfile {
  title: string;
  level: number;
  totalDiscoveries: number;
  rediscoveries: number;
  nextLevelProgress: number;
  nextLevelLabel: string;
}
