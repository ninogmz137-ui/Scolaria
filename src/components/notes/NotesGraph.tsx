import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

type Point = { x: number; y: number };

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function catmullRomToBezier(points: Point[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function NotesGraph({ data }: { data: { x: number; y: number }[] }) {
  const W = 100;
  const H = 52;
  const padX = 2;
  const padY = 5;

  const { linePath, areaPath, points } = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.x - b.x);
    if (sorted.length === 0) return { linePath: '', areaPath: '', points: [] as Point[] };

    const xs = sorted.map((p) => p.x);
    const ys = sorted.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const xSpan = maxX - minX || 1;
    const ySpan = maxY - minY || 1;

    const pts: Point[] = sorted.map((p) => {
      const nx = (p.x - minX) / xSpan;
      const ny = (p.y - minY) / ySpan;
      const x = padX + nx * (W - padX * 2);
      const y = padY + (1 - ny) * (H - padY * 2);
      return { x: clamp(x, padX, W - padX), y: clamp(y, padY, H - padY) };
    });

    const d = catmullRomToBezier(pts);
    if (!d) return { linePath: '', areaPath: '', points: pts };

    const last = pts[pts.length - 1];
    const first = pts[0];
    const baselineY = H;
    const fill = `${d} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;

    return { linePath: d, areaPath: fill, points: pts };
  }, [data]);

  if (data.length === 0) return <View style={{ height: H }} />;

  return (
    <View style={{ height: H }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="notesLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#6366F1" />
            <Stop offset="1" stopColor="#22D3EE" />
          </LinearGradient>
          <LinearGradient id="notesFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="rgba(99,102,241,0.08)" />
            <Stop offset="1" stopColor="rgba(99,102,241,0)" />
          </LinearGradient>
        </Defs>

        {areaPath ? <Path d={areaPath} fill="url(#notesFill)" /> : null}
        {linePath ? (
          <Path d={linePath} fill="none" stroke="url(#notesLine)" strokeWidth={2.5} strokeLinecap="round" />
        ) : null}

        {points.map((p, i) => (
          <Circle key={`pt-${i}`} cx={p.x} cy={p.y} r={4} fill="#FFFFFF" stroke="#6366F1" strokeWidth={1.75} />
        ))}
      </Svg>
    </View>
  );
}

