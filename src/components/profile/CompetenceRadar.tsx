import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Animated, Easing } from 'react-native';
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
  const startAngle = -Math.PI / 2;

  // Animation
  const progress = useRef(new Animated.Value(0)).current;
  const scoreScales = useRef(data.map(() => new Animated.Value(0))).current;
  const [polyPoints, setPolyPoints] = useState('');
  const [dotsVisible, setDotsVisible] = useState(false);

  useEffect(() => {
    const listenerId = progress.addListener(({ value }) => {
      const pts = data
        .map((comp, i) => {
          const p = getPoint(i, comp.value * value);
          return `${p.x},${p.y}`;
        })
        .join(' ');
      setPolyPoints(pts);
      if (value >= 0.95 && !dotsVisible) setDotsVisible(true);
    });

    Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.stagger(
        80,
        scoreScales.map((scale) =>
          Animated.spring(scale, {
            toValue: 1,
            tension: 200,
            friction: 10,
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start();

    return () => progress.removeListener(listenerId);
  }, []);

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 10) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const finalPoints = data.map((comp, i) => getPoint(i, comp.value));

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

        {/* Animated data polygon */}
        {polyPoints ? (
          <Polygon
            points={polyPoints}
            fill="rgba(109,40,217,0.25)"
            stroke={Colors.violet}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        ) : null}

        {/* Data point dots */}
        {dotsVisible &&
          finalPoints.map((p, i) => (
            <Circle
              key={`point-${i}`}
              cx={p.x}
              cy={p.y}
              r={5}
              fill={Colors.cyan}
              stroke={Colors.blueNight}
              strokeWidth={2}
            />
          ))}

        {/* Labels */}
        {data.map((comp, i) => {
          const p = getPoint(i, 12.8);
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
              {comp.emoji} {comp.label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Animated score badges */}
      <View style={styles.scoresRow}>
        {data.map((comp, i) => (
          <Animated.View
            key={comp.label}
            style={[
              styles.scoreBadge,
              {
                transform: [{ scale: scoreScales[i] }],
                borderColor:
                  comp.value >= 8
                    ? Colors.green + '40'
                    : comp.value >= 6
                      ? Colors.cyan + '40'
                      : Colors.orange + '40',
              },
            ]}
          >
            <Text style={styles.scoreBadgeEmoji}>{comp.emoji}</Text>
            <Text
              style={[
                styles.scoreBadgeValue,
                {
                  color:
                    comp.value >= 8
                      ? Colors.green
                      : comp.value >= 6
                        ? Colors.cyan
                        : Colors.orange,
                },
              ]}
            >
              {comp.value}/10
            </Text>
            <Text style={styles.scoreBadgeLabel}>{comp.label}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  scoresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  scoreBadge: {
    alignItems: 'center',
    backgroundColor: Colors.blueNightLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 62,
  },
  scoreBadgeEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  scoreBadgeValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  scoreBadgeLabel: {
    fontSize: 9,
    color: Colors.gray,
    fontWeight: '600',
    marginTop: 1,
  },
});
