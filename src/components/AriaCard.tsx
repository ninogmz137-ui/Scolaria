import { Ionicons } from '@expo/vector-icons';
import { Box, Text, Pressable, HStack, VStack } from './ui';
import { Colors } from '../constants/colors';

type Props = {
  childName: string;
  onPress?: () => void;
};

export default function AriaCard({ childName, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="active:opacity-85">
      <Box
        style={{
          marginHorizontal: 20,
          borderRadius: 20,
          padding: 20,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: Colors.card,
        }}
      >
        {/* Decorative glow */}
        <Box
          className="absolute rounded-full"
          style={{
            top: -30,
            right: -30,
            width: 120,
            height: 120,
            backgroundColor: Colors.violet,
            opacity: 0.08,
          }}
        />

        <HStack className="items-center mb-4">
          <Box
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
          >
            <Ionicons name="sparkles" size={20} color={Colors.violet} />
          </Box>
          <VStack className="ml-3">
            <Text
              className="text-lg font-bold"
              style={{ color: Colors.textPrimary }}
            >
              Aria
            </Text>
            <Text
              className="text-xs mt-0.5"
              style={{ color: Colors.textSecondary }}
            >
              Assistant scolaire intelligent
            </Text>
          </VStack>
        </HStack>

        <Box
          className="rounded-xl p-3.5 mb-3.5"
          style={{ backgroundColor: '#EEF2FF' }}
        >
          <Text
            className="text-sm italic leading-5"
            style={{ color: Colors.textSecondary }}
          >
            « {childName} a progressé en maths cette semaine. Son investissement dans les exercices porte ses fruits ! »
          </Text>
        </Box>

        <HStack className="items-center gap-1.5">
          <Text
            className="text-[13px] font-semibold"
            style={{ color: Colors.violet }}
          >
            Discuter avec Aria
          </Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.violet} />
        </HStack>
      </Box>
    </Pressable>
  );
}
