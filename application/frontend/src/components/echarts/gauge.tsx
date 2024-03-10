import { EChart } from './echart';

export function Gauge(props: {
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
  value: number;
  name: string;
  min?: number;
  max?: number;
  formatter?: (val: number) => string;
}) {
  return (
    <EChart
      className={props.className}
      option={{
        series: [
          {
            type: 'gauge',
            min: props.min ?? 0,
            max: props.max ?? 100,
            detail: {
              valueAnimation: true,
              //formatter: '{value}%',
              formatter: props.formatter ?? ((x) => x + ''),
              offsetCenter: [0, -10],
              fontSize: 20,
              fontWeight: 'bolder',
              borderRadius: 10,
              color: 'inherit',
            },
            progress: { show: true, roundCap: false, width: 5 },
            pointer: { show: false },
            axisTick: { show: false },
            axisLabel: { show: false, distance: -25 },
            splitLine: { show: false, distance: -25 },
            tooltip: {
              trigger: 'item',
            },
            axisLine: {
              show: true,
              lineStyle: {
                width: 1,
                color: [
                  [0, 'rgba(128,128,128,0.5)'],
                  [1, 'rgba(128,128,128,0.5)'],
                ],
              },
            },
            title: { show: true, offsetCenter: [0, 10] },
            splitNumber: 1,
            radius: '100%',

            data: [{ value: +(+props.value).toFixed(1), name: props.name }],
          },
        ],
      }}
    />
  );
}
