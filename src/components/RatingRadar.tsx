import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";

import { colors } from "@/src/theme";

const AXES = [
  { key: "hockey_sense", label: "HS", angle: -90 },
  { key: "skating", label: "SK", angle: 0 },
  { key: "defense", label: "DE", angle: 90 },
  { key: "offense", label: "OF", angle: 180 },
] as const;

const SIZE = 180;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_R = SIZE / 2 - 26;
const MAX_VAL = 5;

function point(angleDeg: number, value: number): [number, number] {
  const r = (Math.min(Math.max(value, 0), MAX_VAL) / MAX_VAL) * MAX_R;
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/** 4-axis skill radar — hockey sense / skating / defense / offense. */
export function RatingRadar({
  values,
}: {
  values: { hockey_sense: number; skating: number; defense: number; offense: number };
}) {
  const poly = AXES.map((a) => point(a.angle, values[a.key]).join(",")).join(" ");
  const rings = [1, 2, 3, 4, 5];

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        {rings.map((r) => (
          <Circle
            key={r}
            cx={CX}
            cy={CY}
            r={(r / MAX_VAL) * MAX_R}
            stroke={colors.border}
            strokeWidth={1}
            fill="none"
          />
        ))}
        {AXES.map((a) => {
          const [x, y] = point(a.angle, MAX_VAL);
          return (
            <Line
              key={a.key}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
            />
          );
        })}
        <Polygon
          points={poly}
          fill={colors.gold}
          fillOpacity={0.25}
          stroke={colors.gold}
          strokeWidth={2}
        />
        {AXES.map((a) => {
          const [x, y] = point(a.angle, MAX_VAL + 0.9);
          return (
            <SvgText
              key={a.key}
              x={x}
              y={y + 4}
              fill={colors.textMuted}
              fontSize={11}
              fontWeight="700"
              textAnchor="middle"
            >
              {a.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 4 },
});
