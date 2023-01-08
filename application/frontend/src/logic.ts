import { ApplicationContext } from './ApplicationState';
import { BlockDevice } from './models/BlockDevice';

export type Credentials = {
  wsUrl: string;
  wsProtocol: 'ssh';
  serverHost: string;
  serverPort: number;
  username: string;
  password: string;
};
let state: Credentials | null = null;

function getCredentialsFromSession(): Credentials | null {
  let sessionStr = null as string | null;
  sessionStr = sessionStorage?.getItem('credentials') ?? null;
  if (sessionStr)
    try {
      return JSON.parse(sessionStr) as Credentials;
    } catch (exc) {
      console.warn(
        'Invalid JSON format of credentials string:',
        sessionStr,
        exc
      );
    }
  return null;
}

export async function initializeState() {
  if (state != null) return; //already initialized
  state = {
    password: '',
    username: 'user',
    wsUrl: getWebsocketUrl() || 'wss://127.0.0.1/ssh',
    serverHost: '127.0.0.1',
    serverPort: 22,
    wsProtocol: 'ssh',
  };
  const sessionCredentials = getCredentialsFromSession();
  if (sessionCredentials) Object.assign(state, sessionCredentials);
}

function getWebsocketBaseUrl(): string | null {
  if (!location.protocol.endsWith('s:')) return 'ws://' + location.host;
  else return 'wss://' + location.host;
}
export function getWebsocketUrl(): string | null {
  const url = getWebsocketBaseUrl();
  if (!url) return null;
  return url + '/ssh';
}

function getState(): Credentials {
  return state!;
}

function makePromise<T>(): {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  promise: Promise<T>;
} {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve: resolve!, reject: reject!, promise };
}

export async function getWebSocket(): Promise<WebSocket | null> {
  const state = getCredentials();
  if (!state) return null;
  const ws = new WebSocket(state.wsUrl, state.wsProtocol);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onclose = rej;
  });
  return ws;
}

export async function getShell(): Promise<WebSocket | null> {
  const state = getState();
  if (!state) return null;
  const ws = await getWebSocket();
  if (!ws) return null;
  ws.send(
    JSON.stringify({
      host: state.serverHost,
      port: state.serverPort,
      username: state.username,
      password: state.password,
      mode: 'shell',
    })
  );
  return ws;
}

type CommandResponse = {
  stdout: string;
  stderr: string;
};
export async function runCommand(command: string): Promise<CommandResponse> {
  const state = getCredentials();
  if (!state) return { stdout: '', stderr: 'Permission denied!' };
  const ws = await getWebSocket();
  if (!ws) return { stdout: '', stderr: 'Could not connect to server!' };
  ws.send(
    JSON.stringify({
      host: state.serverHost,
      port: state.serverPort,
      username: state.username,
      password: state.password,
      mode: 'exec',
    })
  );
  let promiseClose: Promise<void>;
  {
    const { resolve, promise } = makePromise<void>();
    ws.onclose = () => resolve();
    promiseClose = promise;
  }
  if (ws.readyState != WebSocket.OPEN) throw new Error('Websocket not ready!');
  {
    //Wait until ready
    const { resolve, promise } = makePromise<void>();
    let response = '';
    ws.onmessage = (evt) => {
      response = evt.data;
      resolve();
    };
    await promise;
    let error: Error | null = null;
    if (response.startsWith('{'))
      try {
        const jData = JSON.parse(response);
        if (jData.kind == 'exception') error = new Error(jData.error);
      } catch {}
    if (error) throw error;
  }
  ws.send(command + '\n');
  const result: CommandResponse = {
    stderr: '',
    stdout: '',
  };
  ws.onmessage = (evt) => {
    try {
      const pkg = JSON.parse(evt.data);
      if (pkg.source === 'stdout') result.stdout += pkg.data;
      else if (pkg.source === 'stderr') result.stderr += pkg.source;
    } catch (exc) {
      console.warn(exc);
    }
  };
  await promiseClose;
  return result;
}

export type UpdateInformation = {
  packages: { name: string; currentVersion: string; latestVersion: string }[];
};

export async function getUpdateInformation(): Promise<UpdateInformation> {
  const result: UpdateInformation = {
    packages: [],
  };
  const fullResponse = await runCommand(
    'sudo pacman -Sy > /dev/null; sudo pacman -Qu'
  );
  const response = fullResponse.stdout;
  const regex = /(.*) ([^ ]+) -> ([^ ]+)$/gm;
  while (true) {
    const match = regex.exec(response);
    if (!match) break;
    result.packages.push({
      name: match[1],
      currentVersion: match[2],
      latestVersion: match[3],
    });
  }
  return result;
}
export async function isUpdateAvailable(): Promise<boolean> {
  return (await getUpdateInformation()).packages.length > 0;
}
const _updateScreenName = 'hyparvisor.sysupdate';
export async function isUpdateInProgress(): Promise<boolean> {
  const response = await runCommand('screen -ls ' + _updateScreenName);
  return response.stdout.indexOf('hyparvisor') >= 0;
}
export async function updateSystem(): Promise<string> {
  const response = await runCommand(
    'screen -dmS ' + _updateScreenName + ' sudo pacman --noconfirm -Su'
  );
  return response.stdout;
}
export async function getBlockDevices(): Promise<BlockDevice[]> {
  const response = await runCommand('lsblk -bfJ');
  let result: any = null;
  try {
    result = JSON.parse(response.stdout);
  } catch (_) {}
  return result?.blockdevices || [];
}

function parseTable(
  text: string
  //keys: Record<string, string>
): Record<string, string>[] {
  const lines = text.split('\n');
  const result: Record<string, string>[] = [];
  const columns: { title: string; pos: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length == 0) continue;
    if (i == 0) {
      //Header line determine positions
      let spaces = 0;
      let title = '';
      let pos = 0;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char == ' ') spaces++;
        else {
          spaces = 0;
          if (title.length == 0) pos = j;
        }
        if (title.length > 0 || char != ' ') title += char;
        if ((spaces >= 2 || j == line.length - 1) && title.length > 0) {
          columns.push({ title: title.trim(), pos });
          title = '';
        }
      }
      continue;
    }
    if (i == 1) {
      //Separator line. Nothing to do here.
      continue;
    }
    const resultRow: Record<string, string> = {};
    for (let j = 0; j < columns.length; j++) {
      const column = columns[j];
      const endPos = j + 1 < columns.length ? columns[j + 1].pos : line.length;
      const value = line.substring(column.pos, endPos);
      resultRow[column.title] = value.trim();
    }
    result.push(resultRow);
  }
  return result;
}

export type NetworkState = 'active';
export type NetworkInformation = {
  name: string;
  state: NetworkState;
  autostart: boolean;
  persistant: boolean;
};

export async function getVirtualNetworks(): Promise<NetworkInformation[]> {
  const connectionString = 'qemu:///system';
  const response = await runCommand(
    'virsh -c ' + connectionString + ' net-list --all'
  );
  const result = [] as NetworkInformation[];
  const table = parseTable(response.stdout);
  console.log(table);
  for (const row of table)
    result.push({
      name: row['Name'],
      state: row['State'] as NetworkState,
      autostart: row['Autostart'] === 'yes',
      persistant: row['Persistent'] === 'yes',
    });
  return result;
}

export type VirtualMachineState = 'shut off';
export type VirtualMachineInformation = {
  id: string;
  name: string;
  state: VirtualMachineState;
};

export async function getVirtualMachines(): Promise<
  VirtualMachineInformation[]
> {
  const connectionString = 'qemu:///system';
  const response = await runCommand(
    'virsh -c ' + connectionString + ' list --all'
  );
  const table = parseTable(response.stdout);
  const result = [] as VirtualMachineInformation[];
  for (const row of table)
    result.push({
      id: row['Id'],
      name: row['Name'],
      state: row['State'] as VirtualMachineState,
    });
  return result;
}

export async function getVirtualMachine(name: string): Promise<string> {
  const connectionString = 'qemu:///system';
  const response = await runCommand(
    'virsh -c ' + connectionString + ' dumpxml ' + JSON.stringify(name)
  );
  return response.stdout;
}
export async function startVirtualMachine(name: string): Promise<string> {
  const connectionString = 'qemu:///system';
  const response = await runCommand(
    'virsh -c ' + connectionString + ' start ' + JSON.stringify(name)
  );
  return response.stderr;
}
export async function shutdownVirtualMachine(
  name: string,
  force: boolean
): Promise<string> {
  const connectionString = 'qemu:///system';
  const response = await runCommand(
    'virsh -c ' +
      connectionString +
      (force ? ' destroy ' : ' shutdown ') +
      JSON.stringify(name)
  );
  return response.stderr;
}

export function getCredentials(): Credentials | null {
  return state;
}
export function setCredentials(credentials: Credentials | null): void {
  if (credentials) {
    let sessionStr = JSON.stringify(credentials);
    //TODO: Yes, we really store the credentials as plaintext in the users session!
    //The best solution would be creating a temporary ssh-key.
    //This key could be created after logging in with the password.
    //It could be stored instead of the password.
    sessionStorage?.setItem?.('credentials', sessionStr);
  } else sessionStorage?.removeItem('credentials');
  state = credentials;
}
export async function testCredentials(): Promise<boolean> {
  try {
    const result = (await runCommand('echo "OK"')).stdout;
    return result.trim() == 'OK';
  } catch (exc) {
    return false;
  }
}
export async function checkLogin(
  appCtx: ApplicationContext | null
): Promise<boolean> {
  await initializeState();
  const result = await testCredentials();
  if (appCtx && state && result) {
    appCtx.user = state.username + '@' + state.serverHost;
    isUpdateAvailable()
      .then((v) => {
        appCtx.updateAvailable = v;
      })
      .catch(console.error);
    getVirtualMachines()
      .then((vms) => {
        appCtx.vms = vms.map((x) => ({ name: x.name }));
      })
      .catch(console.error);
  } else if (appCtx) {
    appCtx.user = null;
  }
  return result;
}
