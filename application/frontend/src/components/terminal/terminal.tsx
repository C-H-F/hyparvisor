import {
  component$,
  useStylesScoped$,
  useClientEffect$,
} from '@builder.io/qwik';
import { debounce } from 'debounce';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import styles from 'xterm/css/xterm.css';
import { getShell, testCredentials } from '~/logic';

export default component$(() => {
  useStylesScoped$(styles);
  useClientEffect$(
    async () => {
      const divTerm = document.querySelector<HTMLDivElement>('.terminal');
      const xTerm = new XTerm();
      const fitAddon = new FitAddon();
      xTerm.loadAddon(fitAddon);
      if (divTerm) {
        divTerm.style.position = 'relative';
        xTerm.open(divTerm);
        const resizeObserver = new ResizeObserver(
          debounce(() => {
            fitAddon.fit();
          }, 200)
        );
        resizeObserver.observe(divTerm);
      }
      fitAddon.fit();
      const ws = await getShell();
      if(!ws)
        return;
      xTerm.onData((arg) => {
        ws.send(arg);
      });
      ws.onmessage = (msg) => {
        xTerm.write(msg.data);
      };
    },
    { eagerness: 'load' }
  );
  return <div class="terminal"></div>;
});
