import StandardLayout from '@/components/layout/standard-layout';
import { useAsyncEffect } from '@/lib/react-utils';
import { client } from '@/trpc-client';
import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { EChart } from '@/components/echarts/echart';
import { Card } from '@/components/shadcn/ui/card';
import { Gauge } from '@/components/echarts/gauge';
import moment from 'moment';
import bytes from 'bytes-iec';
import { CpuIcon, MemoryStickIcon } from 'lucide-react';

export default function Dashboard() {
  const [totalCpuUsage, setTotalCpuUsage] = useState(0);
  const [totalMemoryUsage, setTotalMemoryUsage] = useState(0);
  const [maxMemory, setMaxMemory] = useState(1);
  const [cpuHistory, setCpuHistory] = useState([
    [new Date().toISOString(), 0, 0],
  ]);
  let interval: ReturnType<typeof setInterval>;
  useAsyncEffect(
    async () => {
      interval = setInterval(async () => {
        const cpuRes = await client.system.getCpuUsage.query();
        const memRes = await client.system.getMemoryUsage.query();
        const cpuUsage = cpuRes.usage ?? 0;
        const maxMem = memRes.total ?? 0;
        const freeMem = memRes.free ?? 0;
        const memUsage = maxMem - freeMem;
        setTotalMemoryUsage(memUsage);
        setTotalCpuUsage(cpuUsage);
        setMaxMemory(maxMem);

        setCpuHistory((cpuHistory) => {
          const result = [...cpuHistory, [new Date().toISOString(), cpuUsage]];
          while (result.length > 60) result.shift();
          return result;
        });
      }, 1000);
    },
    [],
    () => {
      clearInterval(interval);
    }
  );

  return (
    <StandardLayout>
      <Card className="relative m-3 inline-flex w-fit flex-row overflow-hidden">
        <CpuIcon className="absolute -left-5 -top-5 z-0 h-40 w-40 -rotate-12 opacity-[0.02]" />
        <Gauge
          className="m-5 h-36 w-36"
          name="CPU"
          value={totalCpuUsage}
          formatter={(x) => x + '%'}
        />
        <EChart
          className="my-5 mr-5 h-36 w-80"
          option={{
            animation: false,
            grid: {
              left: '40',
              right: '10',
              bottom: '10',
              top: '10',
              containLabel: false,
            },
            xAxis: {
              type: 'time',
              axisLabel: { show: false },
            },
            yAxis: {
              type: 'value',
              show: true,
              axisLabel: { show: true, formatter: (x) => x + '%' },
              splitLine: {
                lineStyle: { color: 'rgba(128,128,128,0.25)' },
              },
              min: 0,
              max: 100,
            },
            series: [
              {
                type: 'line',
                areaStyle: {},
                showSymbol: false,
              },
            ],
            dataset: {
              source: cpuHistory,
            },
            tooltip: {
              trigger: 'axis',
              formatter: (x) => {
                console.log(x);
                const date = (x as any)?.[0]?.value?.[0];
                const perc = (x as any)?.[0]?.value?.[1];
                return moment(date).format('LTS') + '<br />' + perc + '%';
              },
            },
          }}
        />
      </Card>
      <Card className="relative m-3 inline-flex w-fit flex-row overflow-hidden">
        <MemoryStickIcon className="absolute -left-5 -top-5 z-0 h-40 w-40 -rotate-12 opacity-[0.02]" />
        <Gauge
          className="m-5 h-36 w-36"
          name="Memory"
          value={totalMemoryUsage}
          formatter={(x) =>
            bytes.format(x, { mode: 'binary', unitSeparator: ' ' }) ?? '0 B'
          }
          max={maxMemory}
        />
      </Card>
    </StandardLayout>
  );
}
