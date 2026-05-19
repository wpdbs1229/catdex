import { throwIfSupabaseError } from '@/shared/api/client';
import { assertSupabaseConfigured, supabase } from '@/shared/supabase/client';
import type {
  CollectionFollowResult,
  CollectionLikeResult,
  PublicCollection,
  PublicFeaturedCat,
} from '@/shared/types/social';

interface PublicCollectionRow {
  ownerId: string;
  nickname: string;
  profileImageUrl: string | null;
  planName: string;
  hasNyangkkureomi: boolean;
  profile: {
    coverThemeId: string;
    displayTitle: string;
    intro: string;
    selectedBadgeIds: string[];
    selectedStampIds?: string[];
    isPublic: boolean;
  };
  theme: {
    id: string;
    name: string;
    description: string;
    palette: string;
    isPremium: boolean;
  };
  featuredCats: Array<{
    slot: number;
    id: string;
    number: number;
    name: string;
    type: PublicFeaturedCat['type'];
    imageUrl: string | null;
  }>;
  stats: {
    collectedCount: number;
    badgeCount: number;
    stampCount: number;
    likeCount: number;
    followerCount: number;
  };
  viewer: {
    liked: boolean;
    following: boolean;
    isOwner: boolean;
  };
}

async function getDisplayImageUrl(imageUrl: string | null) {
  if (!imageUrl || imageUrl.startsWith('http') || imageUrl.startsWith('file:')) {
    return imageUrl ?? undefined;
  }

  const { data, error } = await supabase.storage.from('cat-images').createSignedUrl(imageUrl, 60 * 60);
  throwIfSupabaseError(error);

  return data.signedUrl;
}

async function mapPublicCollection(row: PublicCollectionRow): Promise<PublicCollection> {
  return {
    ownerId: row.ownerId,
    nickname: row.nickname,
    profileImageUrl: row.profileImageUrl ?? undefined,
    planName: row.planName,
    hasNyangkkureomi: row.hasNyangkkureomi,
    profile: {
      coverThemeId: row.profile.coverThemeId,
      displayTitle: row.profile.displayTitle,
      intro: row.profile.intro,
      selectedBadgeIds: row.profile.selectedBadgeIds,
      selectedStampIds: row.profile.selectedStampIds ?? [],
      isPublic: row.profile.isPublic,
    },
    theme: {
      id: row.theme.id,
      name: row.theme.name,
      description: row.theme.description,
      palette: row.theme.palette,
      isPremium: row.theme.isPremium,
    },
    featuredCats: await Promise.all(
      row.featuredCats.map(async (cat) => ({
        slot: cat.slot,
        id: cat.id,
        number: cat.number,
        name: cat.name,
        type: cat.type,
        imageUrl: await getDisplayImageUrl(cat.imageUrl),
      })),
    ),
    stats: row.stats,
    viewer: row.viewer,
  };
}

export async function fetchPublicCollection(ownerId: string) {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('get_public_collection_detail', {
    p_owner_id: ownerId,
  });

  throwIfSupabaseError(error);

  if (!data) {
    return null;
  }

  return mapPublicCollection(data as PublicCollectionRow);
}

export async function fetchPublicCollectionRankings() {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('list_public_collection_rankings');
  throwIfSupabaseError(error);

  return Promise.all(((data ?? []) as PublicCollectionRow[]).map(mapPublicCollection));
}

export async function toggleCollectionLike(ownerId: string): Promise<CollectionLikeResult> {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('toggle_collection_like', {
    p_owner_id: ownerId,
  });

  throwIfSupabaseError(error);

  return data as CollectionLikeResult;
}

export async function toggleCollectionFollow(ownerId: string): Promise<CollectionFollowResult> {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc('toggle_collection_follow', {
    p_owner_id: ownerId,
  });

  throwIfSupabaseError(error);

  return data as CollectionFollowResult;
}
