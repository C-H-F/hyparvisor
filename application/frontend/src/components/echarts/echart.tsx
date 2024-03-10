import { useEffect, useRef } from 'react';
import { EChartsOption, SetOptionOpts, getInstanceByDom, init } from 'echarts';

export function EChart(props: {
  option: EChartsOption;
  settings?: SetOptionOpts;
  theme?: 'light' | 'dark';

  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    const chart = init(element, props.theme);
    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(element);

    return () => {
      chart.dispose();
      resizeObserver.unobserve(element);
    };
  }, [props.theme]);

  useEffect(() => {
    if (!ref.current) return;
    const chart = getInstanceByDom(ref.current);
    if (!chart) return;
    chart.setOption(props.option, props.settings);
  }, [props.theme, props.option, props.settings]);

  return <div ref={ref} className={props.className} style={props.style}></div>;
}
