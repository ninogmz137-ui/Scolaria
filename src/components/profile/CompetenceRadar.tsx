import { StyleSheet, View, Text } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../constants/colors';

interface Competence {
  label: string;
  value: number; // 0-10
  emoji: string;
}

interface Props {
  data: Competence[];
  size?: number;
}

export default function CompetenceRadar({ data, size = 260 }: Props) {
  const center = size / 2;
  const radius = size / 2 - 40;
  const levels = 5;
  const angleStep = (2 * Math.PI) / data.length;
  // Start from top (-PI/2)
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 10) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Build polygon points for data
  const dataPoints = data
    .map((_, i) => {
      const p = getPoint(i, data[i].value);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Grid levels */}
        {Array.from({ length: levels }, (_, level) => {
          const r = ((level + 1) / levels) * radius;
          const points = data
            .map((_, i) => {
              const angle = startAngle + i * angleStep;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            })
            .join(' ');
          return (
            <Polygon
              key={`grid-${level}`}
              points={points}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines */}
        {data.map((_, i) => {
          const p = getPoint(i, 10);
          return (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon */}
        <Polygon
          points={dataPoints}
          fill="rgba(109,40,217,0.25)"
          stroke={Colors.violet}
          strokeWidth={2}
        />

        {/* Data points */}
        {data.map((_, i) => {
          const p = getPoint(i, data[i].value);
          return (
            <Circle
              key={`point-${i}`}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={Colors.cyan}
              stroke={Colors.blueNight}
              strokeWidth={2}
            />
          );
        })}

        {/* Labels */}
        {data.map((comp, i) => {
          const p = getPoint(i, 12.5);
          return (
            <SvgText
              key={`label-${i}`}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              alignmentBaseline="middle"
              fill={Colors.gray}
              fontSize={11}
              fontWeight="600"
            >
              {comp.emoji} {comp.value}
            </SvgText>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        {data.map((comp) => (
          <View key={comp.label} style={styles.legendItem}>
            <Text style={styles.legendEmoji}>{comp.emoji}</Text>
            <Text style={styles.legendLabel}>{comp.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.blueNightCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  legendEmoji: {
    fontSize: 13,
  },
  legendLabel: {
    fontSize: 11,
    color: Colors.lightGray,
    fontWeight: '500',
  },
});
