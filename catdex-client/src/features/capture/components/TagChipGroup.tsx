import { StyleSheet, Text, View } from 'react-native';
import { Chip } from '@/shared/components/Chip';
import { theme } from '@/shared/styles/theme';

interface TagChipGroupProps<T extends string> {
  label: string;
  options: T[];
  selected: T[];
  multiple?: boolean;
  onChange: (values: T[]) => void;
}

export function TagChipGroup<T extends string>({
  label,
  options,
  selected,
  multiple = false,
  onChange,
}: TagChipGroupProps<T>) {
  const handlePress = (option: T) => {
    if (multiple) {
      onChange(selected.includes(option) ? selected.filter((value) => value !== option) : [...selected, option]);
      return;
    }

    onChange([option]);
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wrap}>
        {options.map((option) => (
          <Chip key={option} onPress={() => handlePress(option)} selected={selected.includes(option)}>
            {option}
          </Chip>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B6956',
  },
  wrap: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
});
