import { ScrollView } from 'react-native';
import { Box, Text, HStack, VStack } from './ui';
import { Colors } from '../constants/colors';

type Grade = {
  id: string;
  subject: string;
  grade: number;
  maxGrade: number;
  date: string;
  emoji: string;
  color: string;
};

type Props = {
  grades: Grade[];
};

function getGradeColor(grade: number, max: number): string {
  const ratio = grade / max;
  if (ratio >= 0.7) return Colors.green;
  if (ratio >= 0.5) return Colors.orange;
  return Colors.red;
}

export default function RecentGrades({ grades }: Props) {
  return (
    <Box className="mt-1">
      <HStack className="justify-between items-center px-5 mb-3.5">
        <Text
          className="text-base font-bold"
          style={{ color: Colors.white }}
        >
          Notes récentes
        </Text>
        <Text
          className="text-[13px] font-medium"
          style={{ color: Colors.cyan }}
        >
          Voir tout →
        </Text>
      </HStack>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {grades.map((item) => (
          <VStack
            key={item.id}
            className="items-center rounded-2xl p-4"
            style={{
              backgroundColor: Colors.blueNightCard,
              width: 130,
            }}
          >
            <Box
              className="w-11 h-11 rounded-full items-center justify-center mb-2.5"
              style={{ backgroundColor: item.color + '20' }}
            >
              <Text className="text-[22px]">{item.emoji}</Text>
            </Box>
            <Text
              className="text-[13px] font-medium mb-1.5 text-center"
              numberOfLines={1}
              style={{ color: Colors.lightGray }}
            >
              {item.subject}
            </Text>
            <HStack className="items-baseline">
              <Text
                className="text-2xl font-extrabold"
                style={{ color: getGradeColor(item.grade, item.maxGrade) }}
              >
                {item.grade}
              </Text>
              <Text
                className="text-[13px] font-medium"
                style={{ color: Colors.gray }}
              >
                /{item.maxGrade}
              </Text>
            </HStack>
            <Text
              className="text-[11px] mt-1"
              style={{ color: Colors.gray }}
            >
              {item.date}
            </Text>
          </VStack>
        ))}
      </ScrollView>
    </Box>
  );
}
