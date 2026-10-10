import { useMemo } from "react";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { formatTick } from "./format";
import { CHART, CHART_FONT } from "./palette";
import { Readout, type ReadoutRow } from "./Readout";
import { finiteOrNull } from "./scales";
import { useChartWidth } from "./useChartWidth";
import { useCrosshair } from "./useCrosshair";
import { buildXYModel, type Mark, type PlotBox, type RefLine, type XYModel, type XYSeries } from "./xyModel";

const X_AXIS_HEIGHT = 18;
const EMPTY_XS: readonly number[] = [];

export interface XYChartProps {
  labels: readonly string[];
  series: readonly XYSeries[];
  height: number;
  refLines?: readonly RefLine[];
  yDomain?: { min?: number; max?: number };
  yTicks?: readonly number[];
  yTickFormat?: (v: number) => string;
  yAxisWidth?: number;
  xMinTickGap?: number;
  verticalGrid?: boolean;
  axisLine?: boolean;
  tickColor?: string;
  tickSize?: number;
  readoutTitle?: (label: string, index: number) => string;
  readoutFormat?: (value: number, seriesId: string) => string;
  testID?: string;
}

function MarkView({ mark }: { mark: Mark }) {
  if (mark.kind === "band") {
    return mark.d ? <Path d={mark.d} fill={mark.fill} stroke="none" /> : null;
  }
  if (mark.kind === "bars") {
    return (
      <G>
        {mark.rects.map((r) => (
          <Rect key={r.index} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color} />
        ))}
      </G>
    );
  }
  if (mark.hidden) return null;
  return (
    <G>
      {mark.d ? (
        <Path
          testID={`line-${mark.id}`}
          d={mark.d}
          stroke={mark.color}
          strokeWidth={mark.width}
          strokeDasharray={mark.dash}
          fill="none"
        />
      ) : null}
      {mark.anchors.map((a, i) => (
        <Circle
          key={i}
          testID={`anchor-${mark.id}`}
          cx={a.x}
          cy={a.y}
          r={3.5}
          fill={CHART.bg}
          stroke={mark.color}
          strokeWidth={1.5}
        />
      ))}
    </G>
  );
}

function RefLineView({ line, plot }: { line: RefLine & { py: number }; plot: PlotBox }) {
  const left = line.labelSide !== "right";
  return (
    <G>
      <Line
        x1={plot.left}
        x2={plot.right}
        y1={line.py}
        y2={line.py}
        stroke={line.color}
        strokeWidth={line.width ?? 1}
        strokeDasharray={line.dash}
      />
      {line.label ? (
        <SvgText
          x={left ? plot.left + 2 : plot.right - 2}
          y={line.py - 2}
          fontSize={line.labelSize ?? 9}
          fill={line.labelColor ?? line.color}
          fontFamily={CHART_FONT.sans}
          textAnchor={left ? "start" : "end"}
        >
          {line.label}
        </SvgText>
      ) : null}
    </G>
  );
}

function CrosshairView({ model, index }: { model: XYModel; index: number }) {
  const x = model.xs[index];
  return (
    <G>
      <Line
        testID="crosshair"
        x1={x}
        x2={x}
        y1={model.plot.top}
        y2={model.plot.bottom}
        stroke={CHART.crosshair}
        strokeWidth={1}
      />
      {model.marks.map((m) => {
        if (m.kind !== "line" || m.hidden || !m.activeDot) return null;
        const y = m.points[index];
        return y === null ? null : <Circle key={m.id} cx={x} cy={y} r={3} fill={m.color} />;
      })}
    </G>
  );
}

function readoutRows(
  series: readonly XYSeries[],
  index: number,
  format: ((value: number, seriesId: string) => string) | undefined,
): ReadoutRow[] {
  const rows: ReadoutRow[] = [];
  for (const s of series) {
    if (s.kind === "band" || s.inReadout === false) continue;
    const v = finiteOrNull(s.values[index]);
    const color = s.kind === "line" ? s.color : v === null ? CHART.tick : s.colorAt(v, index);
    rows.push({
      key: s.id,
      name: s.name,
      color,
      value: v === null ? "--" : format ? format(v, s.id) : v.toFixed(2),
    });
  }
  return rows;
}

/**
 * Generic line / bar / band chart. Measures its own width, so give it a
 * parent with a definite width (any normal block layout does).
 */
export function XYChart({
  labels,
  series,
  height,
  refLines,
  yDomain,
  yTicks,
  yTickFormat = formatTick,
  yAxisWidth = 40,
  xMinTickGap = 60,
  verticalGrid = true,
  axisLine = false,
  tickColor = CHART.tickDim,
  tickSize = 9,
  readoutTitle,
  readoutFormat,
  testID = "xy-chart",
}: XYChartProps) {
  const { width, onLayout } = useChartWidth();
  const model = useMemo(
    () =>
      width > 0 && labels.length > 0
        ? buildXYModel({
            labels,
            series,
            refLines,
            yDomain,
            yTicks,
            width,
            height,
            yAxisWidth,
            xAxisHeight: X_AXIS_HEIGHT,
            xMinTickGap,
          })
        : null,
    [labels, series, refLines, yDomain, yTicks, width, height, yAxisWidth, xMinTickGap],
  );
  const { index, gesture } = useCrosshair(model?.xs ?? EMPTY_XS, testID);

  return (
    <View testID={testID} onLayout={onLayout} style={{ height }}>
      {model ? (
        <GestureDetector gesture={gesture}>
          <View collapsable={false} style={{ width, height }}>
            <Svg width={width} height={height} testID={`${testID}-svg`}>
              <G>
                {model.yTicks.map((t) => (
                  <Line
                    key={`gy-${t.value}`}
                    x1={model.plot.left}
                    x2={model.plot.right}
                    y1={t.y}
                    y2={t.y}
                    stroke={CHART.grid}
                    strokeDasharray="3 3"
                  />
                ))}
                {verticalGrid
                  ? model.xTicks.map((t) => (
                      <Line
                        key={`gx-${t.index}`}
                        x1={t.x}
                        x2={t.x}
                        y1={model.plot.top}
                        y2={model.plot.bottom}
                        stroke={CHART.grid}
                        strokeDasharray="3 3"
                      />
                    ))
                  : null}
              </G>
              {axisLine ? (
                <G>
                  <Line
                    x1={model.plot.left}
                    x2={model.plot.right}
                    y1={model.plot.bottom}
                    y2={model.plot.bottom}
                    stroke={CHART.axisLine}
                  />
                  <Line
                    x1={model.plot.left}
                    x2={model.plot.left}
                    y1={model.plot.top}
                    y2={model.plot.bottom}
                    stroke={CHART.axisLine}
                  />
                </G>
              ) : null}
              {model.marks.map((m) => (
                <MarkView key={m.id} mark={m} />
              ))}
              {model.refLines.map((r) => (
                <RefLineView key={r.id} line={r} plot={model.plot} />
              ))}
              {model.yTicks.map((t) => (
                <SvgText
                  key={`ty-${t.value}`}
                  x={model.plot.left - 4}
                  y={t.y + 3}
                  fontSize={tickSize}
                  fill={tickColor}
                  fontFamily={CHART_FONT.sans}
                  textAnchor="end"
                >
                  {yTickFormat(t.value)}
                </SvgText>
              ))}
              {model.xTicks.map((t, i, all) => (
                <SvgText
                  key={`tx-${t.index}`}
                  x={t.x}
                  y={height - 4}
                  fontSize={tickSize}
                  fill={tickColor}
                  fontFamily={CHART_FONT.sans}
                  textAnchor={all.length === 1 ? "middle" : i === 0 ? "start" : i === all.length - 1 ? "end" : "middle"}
                >
                  {t.label}
                </SvgText>
              ))}
              {index !== null ? <CrosshairView model={model} index={index} /> : null}
            </Svg>
            {index !== null ? (
              <Readout
                title={readoutTitle ? readoutTitle(labels[index], index) : labels[index]}
                rows={readoutRows(series, index, readoutFormat)}
                align={model.xs[index] > (model.plot.left + model.plot.right) / 2 ? "left" : "right"}
              />
            ) : null}
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}
