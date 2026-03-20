import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Colors } from '../constants/colors';

export type Child = {
  id: string;
  name: string;
  avatar: string;
  classe: string;
};

type Props = {
  children: Child[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const AVATAR_COLORS = [Colors.violet, Colors.cyan, Colors.pink, Colors.green];

export default function ChildSwitcher({ children, selectedId, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {children.map((child, index) => {
          const isSelected = child.id === selectedId;
          const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

          return (
            <TouchableOpacity
              key={child.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelect(child.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>{child.avatar}</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, isSelected && styles.nameSelected]}>
                  {child.name}
                </Text>
                <Text style={styles.classe}>{child.classe}</Text>
              </View>
              {isSelected && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blueNightCard,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: Colors.cyan,
    backgroundColor: Colors.blueNightLight,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
  },
  info: {
    marginLeft: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray,
  },
  nameSelected: {
    color: Colors.white,
  },
  classe: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 1,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.cyan,
    marginLeft: 10,
  },
});
