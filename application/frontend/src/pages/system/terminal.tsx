import StandardLayout from '@/components/layout/standard-layout';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { debounce } from 'debounce';
import { client } from '@/trpc-client';
import { toAbsoluteWebsocketUrl } from '@/lib/utils';
export default function Terminal() {
  const setTerminalRef = async (terminal: HTMLDivElement) => {
    if (!terminal) return;
    console.log('Requesting terminal...');
    const xTerm = new XTerm();
    const fitAddon = new FitAddon();
    xTerm.loadAddon(fitAddon);
    terminal.style.position = 'relative';
    xTerm.open(terminal);
    const resizeObserver = new ResizeObserver(
      debounce(() => {
        fitAddon.fit();
      }, 200)
    );
    resizeObserver.observe(terminal);
    fitAddon.fit();

    let connIdx = 0;
    const connectingInterval = setInterval(() => {
      xTerm.clear();
      xTerm.write('Connecting to server');
      for (let i = 0; i < connIdx; i++) xTerm.write('.');
      connIdx = (connIdx + 1) % 4;
      xTerm.write('\r\n');
    }, 1000);
    try {
      const websocketUrl = await client.system.spawnShell.mutate();
      const ws = new WebSocket(toAbsoluteWebsocketUrl(websocketUrl));
      ws.onopen = () => {
        clearInterval(connectingInterval);
        xTerm.clear();
      };
      xTerm.onData((arg) => ws.send(JSON.stringify({ c: arg })));
      xTerm.onResize(
        debounce((arg) => {
          ws.send(
            JSON.stringify({ type: 'resize', cols: arg.cols, rows: arg.rows })
          );
        }, 1000)
      );
      ws.onmessage = (evt) => xTerm.write(evt.data);
    } catch (err) {
      clearInterval(connectingInterval);
      xTerm.write('Connection closed. Reason: ' + err);
    }
  };

  return (
    <StandardLayout>
      <div>
        <div ref={setTerminalRef} style={{ height: 500 }}></div>
      </div>
    </StandardLayout>
  );
}
