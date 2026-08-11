import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PawPrint, Search, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/app/navigation/types';
import { useTabBarInset } from '@/app/navigation/useTabBarInset';
import { fetchDexPlaceholders, fetchMyCats } from '@/shared/api/cats.api';
import { PolaroidCatCard } from '@/shared/components/PolaroidCatCard';
import { loadFavoriteCatIds, saveFavoriteCatIds } from '@/shared/favorites/favorites-storage';
import { nd } from '@/shared/styles/theme';
import type { Cat, DexPlaceholder } from '@/shared/types/cat';
import { imageForCatType } from '@/shared/utils/catImage';
import { formatNyanTagLabel } from '@/shared/utils/catPresentation';

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function catMatchesSearch(cat: Cat, query: string) {
  if (!query) {
    return true;
  }

  return [cat.name, cat.type, cat.relationshipLevel, cat.memo ?? '', ...cat.tags]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export function CatDexScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cats, setCats] = useState<Cat[]>([]);
  const [placeholders, setPlaceholders] = useState<DexPlaceholder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [likedCatIds, setLikedCatIds] = useState<Set<string>>(() => new Set());
  const tabBarInset = useTabBarInset();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([fetchMyCats(), fetchDexPlaceholders(), loadFavoriteCatIds()])
        .then(([nextCats, nextPlaceholders, nextFavorites]) => {
          if (isActive) {
            setCats(nextCats);
            setPlaceholders(nextPlaceholders);
            setLikedCatIds(nextFavorites);
          }
        })
        .catch((error: unknown) => {
          console.warn('[dex] load failed', error);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const visibleCats = useMemo(
    () => cats.filter((cat) => catMatchesSearch(cat, normalizedSearchQuery)),
    [cats, normalizedSearchQuery],
  );
  const lockedPlaceholders = normalizedSearchQuery ? [] : placeholders.slice(0, 2);
  const hasSearchQuery = normalizedSearchQuery.length > 0;

  const toggleLike = (catId: string) => {
    setLikedCatIds((prev) => {
      const next = new Set(prev);

      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }

      // 홈의 "즐겨찾기한 고양이"가 같은 목록을 읽으므로 기기에 남긴다.
      saveFavoriteCatIds(next).catch((error: unknown) => {
        console.warn('[dex] favorite save failed', error);
      });

      return next;
    });
  };

  const gridRows = useMemo(() => {
    const entries: Array<{ key: string; cat?: Cat; placeholder?: DexPlaceholder }> = [
      ...visibleCats.map((cat) => ({ key: cat.id, cat })),
      ...lockedPlaceholders.map((placeholder) => ({ key: placeholder.id, placeholder })),
    ];
    const rows: (typeof entries)[] = [];

    for (let index = 0; index < entries.length; index += 2) {
      rows.push(entries.slice(index, index + 2));
    }

    return rows;
  }, [lockedPlaceholders, visibleCats]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>도감</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.searchBar}>
          <Search color={nd.colors.ink} size={20} strokeWidth={1.8} />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearchQuery}
            placeholder="내 도감에서 고양이를 찾아보세요"
            placeholderTextColor={nd.colors.sub}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchQuery}
          />
          <SlidersHorizontal color={nd.colors.ink} size={20} strokeWidth={1.8} />
        </View>

        <View style={styles.grid}>
          {gridRows.map((row) => (
            <View key={row[0].key} style={styles.gridRow}>
              {row.map((entry) =>
                entry.cat ? (
                  <PolaroidCatCard
                    imageSource={imageForCatType(entry.cat.type, entry.cat.imageUrl)}
                    key={entry.key}
                    liked={likedCatIds.has(entry.cat.id)}
                    onPress={() => navigation.navigate('CatDetail', { catId: entry.cat!.id })}
                    onToggleLike={() => toggleLike(entry.cat!.id)}
                    tagLabel={formatNyanTagLabel(entry.cat.name, entry.cat.firstSeenAt)}
                  />
                ) : entry.placeholder ? (
                  <PolaroidCatCard
                    imageSource={imageForCatType(entry.placeholder.type, entry.placeholder.imageUrl)}
                    key={entry.key}
                    locked
                    tagLabel="아직 만나지 못했어요"
                  />
                ) : null,
              )}
              {row.length === 1 ? <View style={styles.gridSpacer} /> : null}
            </View>
          ))}
        </View>

        {visibleCats.length === 0 && lockedPlaceholders.length === 0 ? (
          <View style={styles.emptyState}>
            <PawPrint color={nd.colors.subtle} size={38} />
            <Text style={styles.emptyTitle}>{hasSearchQuery ? '검색 결과가 없어요' : '아직 수집한 고양이가 없어요'}</Text>
            <Text style={styles.emptyText}>
              {hasSearchQuery ? '다른 이름이나 특징으로 다시 찾아보세요.' : '첫 고양이를 등록하면 내 도감 페이지가 여기에 채워져요.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nd.colors.bg,
  },
  titleBar: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: nd.colors.ink,
  },
  content: {
    paddingTop: 4,
    // 하단 여백은 useTabBarInset이 준다.
  },
  searchBar: {
    height: 48,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    backgroundColor: nd.colors.bg,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 14,
    letterSpacing: -0.35,
    color: nd.colors.ink,
  },
  grid: {
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gridSpacer: {
    flex: 1,
  },
  emptyState: {
    marginTop: 32,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    borderRadius: nd.radius.input,
    borderWidth: 1,
    borderColor: nd.colors.border,
    padding: 20,
  },
  emptyTitle: {
    marginTop: 12,
    color: nd.colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 5,
    color: nd.colors.sub,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
