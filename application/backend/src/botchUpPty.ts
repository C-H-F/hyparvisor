// BotchUpPty is a simple and naive (incomplete) replacement for
// node-pty which does not work on bun.
// It requires the unbuffer command from the expect package to work.

export function spawn(
  shell: string,
  args: [],
  options: {
    name?: 'xterm-256color';
    cols: number;
    rows: number;
    cwd?: string | undefined;
    env?: NodeJS.ProcessEnv | undefined;
    encoding?: ConstructorParameters<typeof TextDecoder>[0] | undefined;
  }
) {
  console.log('spawn', shell, args);
  const subprocess = Bun.spawn(['unbuffer', '-p', shell, ...args], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const decoder = new TextDecoder(options.encoding || 'utf-8');
  let cols = options.cols;
  let rows = options.rows;
  subprocess.stdin.write(` HISTCONTROL=ignorespace\n`);
  subprocess.stdin.write(` stty cols ${+cols}\n`);
  subprocess.stdin.write(` stty rows ${+rows}\n`);
  subprocess.stdin.write(` stty echo\n`);
  return {
    cols,
    rows,
    onData: async (cb: (data: string) => void) => {
      const reader = subprocess.stdout.getReader();
      while (true) {
        const { done, value: byteValue } = await reader.read();
        if (done) break;
        const value = decoder.decode(byteValue);
        cb(value);
      }
    },
    write: (data: string) => {
      subprocess.stdin.write(data);
      subprocess.stdin.flush();
    },
    resize: (c: number, r: number) => {
      cols = c;
      rows = r;
    },
    kill: () => {
      subprocess.stdin.end();
      subprocess.kill();
    },
  };
}
