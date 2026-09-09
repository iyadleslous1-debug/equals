import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Input } from '@/components/Input';
import { WILAYAS } from '@/constants/wilayas';
import { FILTER_SORTS, type DeckFilters } from '@/lib/validation/schemas';

export interface FilterSheetProps {
  initial: DeckFilters;
  /** Without a completed survey, Best-match sorting silently falls back —
   *  hide the chip instead of offering a no-op. */
  compatAvailable: boolean;
  fieldErrors: Record<string, string>;
  pending: boolean;
  onApply: (filters: DeckFilters) => void;
  onReset: () => void;
  testID?: string;
}

const SORT_LABELS: Record<(typeof FILTER_SORTS)[number], string> = {
  default: 'Recommended',
  newest: 'Newest',
  compat: 'Best match',
};

function parseAge(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isInteger(n) ? n : null;
}

function ageText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

export function FilterSheet({
  initial,
  compatAvailable,
  fieldErrors,
  pending,
  onApply,
  onReset,
  testID,
}: FilterSheetProps) {
  const [ageMin, setAgeMin] = useState(ageText(initial.age_min));
  const [ageMax, setAgeMax] = useState(ageText(initial.age_max));
  const [wilayas, setWilayas] = useState<number[]>(initial.wilayas ?? []);
  const [sort, setSort] = useState<DeckFilters['sort']>(initial.sort ?? 'default');
  const [query, setQuery] = useState('');
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');

  const toggleWilaya = (code: number): void => {
    setWilayas((prev) => (prev.includes(code) ? prev.filter((w) => w !== code) : [...prev, code]));
  };

  const apply = (): void => {
    onApply({
      age_min: parseAge(ageMin),
      age_max: parseAge(ageMax),
      wilayas: wilayas.length === 0 ? null : [...wilayas].sort((a, b) => a - b),
      sort,
    });
  };

  const visible = WILAYAS.filter((w) => {
    const q = query.trim().toLowerCase();
    if (q === '') return true;
    return w.name.toLowerCase().includes(q) || String(w.code) === q;
  });

  return (
    <View testID={testID} className="gap-4">
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Input
            label="Min age"
            value={ageMin}
            onChangeText={setAgeMin}
            keyboardType="number-pad"
            placeholder="18"
            error={fieldErrors.age_min}
            testID={t('age-min')}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Max age"
            value={ageMax}
            onChangeText={setAgeMax}
            keyboardType="number-pad"
            placeholder="100"
            error={fieldErrors.age_max}
            testID={t('age-max')}
          />
        </View>
      </View>
      <View>
        <Text className="mb-2 text-sm font-semibold text-text">
          Wilayas{wilayas.length > 0 ? ` (${wilayas.length})` : ''}
        </Text>
        <Input
          label="Search wilayas"
          value={query}
          onChangeText={setQuery}
          placeholder="Name or code…"
          testID={t('wilaya-search')}
        />
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.code)}
          className="mt-2 max-h-56"
          ListEmptyComponent={<Text className="py-4 text-center text-sm text-muted">No wilayas found.</Text>}
          renderItem={({ item }) => {
            const selected = wilayas.includes(item.code);
            return (
              <Pressable
                testID={t(`wilaya-${item.code}`)}
                onPress={() => toggleWilaya(item.code)}
                accessibilityRole="button"
                accessibilityLabel={`${item.code} — ${item.name}`}
                accessibilityState={{ selected }}
                className="min-h-[44px] flex-row items-center justify-between border-b border-border py-3"
              >
                <Text className="text-base text-text">
                  {item.code} — {item.name}
                </Text>
                <Text className="text-base text-secondary">{selected ? '✓' : ''}</Text>
              </Pressable>
            );
          }}
        />
        {fieldErrors.wilayas ? (
          <Text testID={t('wilayas-error')} className="mt-1 text-xs text-destructive">
            {fieldErrors.wilayas}
          </Text>
        ) : null}
      </View>
      <View>
        <Text className="mb-2 text-sm font-semibold text-text">Sort by</Text>
        <View className="flex-row flex-wrap gap-2">
          {FILTER_SORTS.filter((option) => option !== 'compat' || compatAvailable).map((option) => (
            <Chip
              key={option}
              label={SORT_LABELS[option]}
              selected={sort === option}
              onPress={() => setSort(option)}
              testID={t(`sort-${option}`)}
            />
          ))}
        </View>
        {fieldErrors.sort ? (
          <Text testID={t('sort-error')} className="mt-1 text-xs text-destructive">
            {fieldErrors.sort}
          </Text>
        ) : null}
      </View>
      {fieldErrors.form ? (
        <Text testID={t('form-error')} className="text-sm text-destructive">
          {fieldErrors.form}
        </Text>
      ) : null}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            title="Reset"
            onPress={onReset}
            disabled={pending}
            variant="secondary"
            testID={t('reset')}
          />
        </View>
        <View className="flex-1">
          <Button title="Apply" onPress={apply} loading={pending} testID={t('apply')} />
        </View>
      </View>
    </View>
  );
}
