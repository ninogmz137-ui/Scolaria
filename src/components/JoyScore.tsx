import { Box, Text, HStack, VStack } from './ui';
import { Colors } from '../constants/colors';

type DayScore = {
  day: string;
  score: number; // 0 to 10
  emoji: string;
};

type Props = {
  data: DayScore[];
  average: number;
};

const BAR_MAX_HEIGHT = 60;

function getBarColor(score: number): string {
  if (score >= 7) return Colors.green;
  if (score >= 4) return Colors.orange;
  return Colors.red;
}

export default function JoyScore({ data, average }: Props) {
  return (
    <Box
      className="mx-5 rounded-[20px] p-5"
      style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }}
    >
      <HStack className="justify-between items-center mb-5">
        <VStack>
          <Text
            className="text-base font-bold"
            style={{ color: Colors.textPrimary }}
          >
            Score de Joie
          </Text>
          <Text
            className="text-xs mt-0.5"
            style={{ color: Colors.textSecondary }}
          >
            7 derniers jours
          </Text>
        </VStack>
        <HStack
          className="items-baseline px-3 py-1.5 rounded-xl"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
        >
          <Text
            className="text-[22px] font-extrabold"
            style={{ color: '#F59E0B' }}
          >
            {average.toFixed(1)}
          </Text>
          <Text
            className="text-xs ml-0.5"
            style={{ color: Colors.textSecondary }}
          >
            /10
          </Text>
        </HStack>
      </HStack>

      <HStack className="justify-between items-end">
        {data.map((item, index) => {
          const height = Math.max(4, (item.score / 10) * BAR_MAX_HEIGHT);
          return (
            <VStack key={index} className="items-center flex-1">
              <Text className="text-base mb-1.5">{item.emoji}</Text>
              <Box
                className="w-5 rounded-[10px] overflow-hidden justify-end"
                style={{
                  height: BAR_MAX_HEIGHT,
                  backgroundColor: '#EEF0F5',
                }}
              >
                <Box
                  className="w-5 rounded-[10px]"
                  style={{
                    height,
                    backgroundColor: getBarColor(item.score),
                  }}
                />
              </Box>
              <Text
                className="text-[11px] mt-1.5 font-medium"
                style={{ color: Colors.textSecondary }}
              >
                {item.day}
              </Text>
            </VStack>
          );
        })}
      </HStack>
    </Box>
  );
}
