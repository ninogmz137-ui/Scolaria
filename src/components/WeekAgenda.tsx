import { Box, Text, HStack, VStack } from './ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type AgendaEvent = {
  id: string;
  time: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isNow?: boolean;
};

type Props = {
  events: AgendaEvent[];
  dayLabel: string;
};

export default function WeekAgenda({ events, dayLabel }: Props) {
  return (
    <Box className="mx-5">
      <HStack className="justify-between items-center mb-4">
        <Text
          className="text-base font-bold"
          style={{ color: Colors.textPrimary }}
        >
          Agenda
        </Text>
        <Box
          className="px-3 py-[5px] rounded-[10px]"
          style={{ backgroundColor: '#EEF2FF' }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: Colors.violet }}
          >
            {dayLabel}
          </Text>
        </Box>
      </HStack>

      <VStack>
        {events.map((event, index) => (
          <HStack key={event.id} style={{ minHeight: 68 }}>
            {/* Time column */}
            <Box className="pt-3.5" style={{ width: 48 }}>
              <Text
                className="text-xs font-medium"
                style={{
                  color: event.isNow ? Colors.violet : Colors.textSecondary,
                  fontWeight: event.isNow ? '700' : '500',
                }}
              >
                {event.time}
              </Text>
            </Box>

            {/* Timeline dot + line */}
            <VStack className="items-center pt-[17px]" style={{ width: 20 }}>
              <Box
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: event.isNow ? Colors.violet : event.color,
                }}
              />
              {index < events.length - 1 && (
                <Box
                  className="flex-1 mt-1"
                  style={{
                    width: 2,
                    backgroundColor: Colors.cardBorder,
                  }}
                />
              )}
            </VStack>

            {/* Event card */}
            <HStack
              className="flex-1 items-center rounded-[14px] p-3 ml-2.5 mb-2"
              style={{
                backgroundColor: Colors.card,
              }}
            >
              <Box
                className="w-9 h-9 rounded-[10px] items-center justify-center"
                style={{ backgroundColor: event.color + '20' }}
              >
                <Ionicons name={event.icon} size={18} color={event.color} />
              </Box>
              <VStack className="flex-1 ml-2.5">
                <Text
                  className="text-sm font-semibold"
                  style={{ color: Colors.textPrimary }}
                >
                  {event.title}
                </Text>
                {event.subtitle && (
                  <Text
                    className="text-[11px] mt-0.5"
                    style={{ color: Colors.textSecondary }}
                  >
                    {event.subtitle}
                  </Text>
                )}
              </VStack>
              {event.isNow && (
                <Box
                  className="px-2 py-[3px] rounded-md"
                  style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                >
                  <Text
                    className="text-[10px] font-bold"
                    style={{ color: Colors.violet }}
                  >
                    En cours
                  </Text>
                </Box>
              )}
            </HStack>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
}
