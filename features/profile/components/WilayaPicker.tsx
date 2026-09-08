import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Input } from '@/components/Input';
import { Sheet } from '@/components/Sheet';
import { WILAYAS } from '@/constants/wilayas';

export interface WilayaPickerProps {
  value: number | null;
  onSelect: (code: number) => void;
  testID?: string;
}

export function labelFor(code: number): string {
  const found = WILAYAS.find((w) => w.code === code);
  return found ? `${found.code} — ${found.name}` : 'Choisir la wilaya';
}

export function WilayaPicker({ value, onSelect, testID }: WilayaPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const matches = WILAYAS.filter(
    (w) =>
      needle === '' ||
      w.name.toLowerCase().includes(needle) ||
      w.nameAr.includes(query.trim()) ||
      String(w.code) === needle,
  );

  const choose = (code: number): void => {
    onSelect(code);
    setOpen(false);
    setQuery('');
  };

  return (
    <View>
      <Pressable
        testID={testID ? `${testID}-open` : undefined}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Choisir la wilaya"
        className="rounded-xl border border-border bg-ink px-4 py-3"
      >
        <Text className={`text-base ${value === null ? 'text-faint' : 'text-text'}`}>
          {value === null ? 'Choisir la wilaya' : labelFor(value)}
        </Text>
      </Pressable>
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Wilaya"
        testID={testID ? `${testID}-sheet` : undefined}
      >
        <Input
          label="Rechercher"
          value={query}
          onChangeText={setQuery}
          placeholder="Alger, وهران, 31…"
          testID={testID ? `${testID}-search` : undefined}
        />
        <FlatList
          data={matches}
          keyExtractor={(item) => String(item.code)}
          className="mt-2 max-h-80"
          ListEmptyComponent={
            <Text className="py-6 text-center text-sm text-muted">Aucune wilaya trouvée.</Text>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => choose(item.code)} className="border-b border-border py-3">
              <Text className="text-base text-text">
                {item.code} — {item.name} · {item.nameAr}
              </Text>
            </Pressable>
          )}
        />
      </Sheet>
    </View>
  );
}
