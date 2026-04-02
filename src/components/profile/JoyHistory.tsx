import { ScrollView } from 'react-native';
import { Box, Text, HStack, VStack } from '../ui';
import { Colors } from '../../constants/colors';

interface DayScore {
  day: number;
  score: number;
}

interface Props {
  data: DayScore[];
  month: string;
}

const getColor = (score: number) => {
  if (score >= 8) return Colors.green;
  if (score >= 6) return Colors.cyan;
  if (score >= 4) return Colors.orange;
  return Colors.red;
};

export default function JoyHistory({ data, month }: Props) {
  const avg = data.reduce((s, d) => s + d.score, 0) / data.length;
  const maxStreak = (() => {
    let max = 0;
    let cur = 0;
    for (const d of data) {
      if (d.score >= 7) {
        cur++;
        max = Math.max(max, cur);
      } else {
        cur = 0;
      }
    }
    return max;
  })();

  return (
    <Box
      className="rounded-2xl p-4"
      style={{
        backgroundColor: Colors.card,
      }}
    >
      {/* Header */}
      <HStack className="justify-between items-center mb-3.5">
        <Text className="text-base font-bold" style={{ color: Colors.textPrimary }}>
          Score de Joie
        </Text>
        <Text className="text-[13px] font-semibold" style={{ color: Colors.cyan }}>
          {month}
        </Text>
      </HStack>

      {/* Stats row */}
      <HStack
        className="rounded-xl p-3.5 mb-4"
        style={{ backgroundColor: '#F1F5F9' }}
      >
        <VStack className="flex-1 items-center">
          <Text className="text-xl font-black mb-0.5" style={{ color: Colors.cyan }}>
            {avg.toFixed(1)}
          </Text>
          <Text className="text-[11px]" style={{ color: Colors.textMuted }}>Moyenne</Text>
        </VStack>
        <Box style={{ width: 1, backgroundColor: Colors.cardBorder }} />
        <VStack className="flex-1 items-center">
          <Text className="text-xl font-black mb-0.5" style={{ color: Colors.green }}>
            {maxStreak}j
          </Text>
          <Text className="text-[11px]" style={{ color: Colors.textMuted }}>Meilleure série</Text>
        </VStack>
        <Box style={{ width: 1, backgroundColor: Colors.cardBorder }} />
        <VStack className="flex-1 items-center">
          <Text className="text-xl font-black mb-0.5" style={{ color: Colors.orange }}>
            {data.filter((d) => d.score >= 7).length}
          </Text>
          <Text className="text-[11px]" style={{ color: Colors.textMuted }}>Jours heureux</Text>
        </VStack>
      </HStack>

      {/* Calendar grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <HStack className="gap-1.5 py-1">
          {data.map((d) => (
            <VStack key={d.day} className="items-center gap-1" style={{ width: 28 }}>
              <Box
                className="rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  backgroundColor: getColor(d.score),
                  ...(d.score >= 8
                    ? {
                        shadowColor: 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0,
                        shadowRadius: 0,
                        elevation: 0,
                      }
                    : {}),
                }}
              />
              <Text className="text-[10px] font-medium" style={{ color: Colors.textMuted }}>
                {d.day}
              </Text>
            </VStack>
          ))}
        </HStack>
      </ScrollView>

      {/* Legend */}
      <HStack className="justify-center gap-4 mt-3">
        <HStack className="items-center gap-1">
          <Box className="rounded-full" style={{ width: 10, height: 10, backgroundColor: Colors.green }} />
          <Text className="text-[11px]" style={{ color: Colors.textMuted }}>8-10</Text>
        </HStack>
        <HStack className="items-center gap-1">
          <Box className="rounded-full" style={{ width: 10, height: 10, backgroundColor: Colors.cyan }} />
          <Text className="text-[11px]" style={{ color: Colors.textMuted }}>6-7</Text>
        </HStack>
        <HStack className="items-center gap-1">
          <Box className="rounded-full" style={{ width: 10, height: 10, backgroundColor: Colors.orange }} />
          <Text className="text-[11px]" style={{ color: Colors.textMuted }}>4-5</Text>
        </HStack>
        <HStack className="items-center gap-1">
          <Box className="rounded-full" style={{ width: 10, height: 10, backgroundColor: Colors.red }} />
          <Text className="text-[11px]" style={{ color: Colors.textMuted }}>0-3</Text>
        </HStack>
      </HStack>
    </Box>
  );
}
