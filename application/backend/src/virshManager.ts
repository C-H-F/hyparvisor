import { promisify } from 'util';
import { exec } from 'child_process';
import { vmState } from './models/vm.js';
import { z } from 'zod';

export const execAsync = promisify(exec);

export const instance = z.object({
  id: z.string().optional(),
  name: z.string(),
  state: vmState,
});
type Instance = z.infer<typeof instance>;

export async function listAllVirtualMachines() {
  const { stdout } = await execAsync('virsh list --all', {
    encoding: 'utf8',
  });
  const result = [] as Instance[];
  const table = parseTable(stdout);
  for (const row of table)
    result.push({
      id: row['Id'],
      name: row['Name'],
      state: vmState.catch('undefined').parse(row['State']),
    });
  return result;
}

export function parseTable(
  text: string,
  separator: RegExp = /\s\s+/g
): Record<string, string>[] {
  const lines = text.split('\n');
  const result: Record<string, string>[] = [];
  const columns: { title: string; pos: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length == 0) continue;
    if (i == 0) {
      //Header line determine positions
      let title = '';

      //for (let j = 0; j < line.length; j++) {
      while (true) {
        let startPos = separator.lastIndex;
        const regexRes = separator.exec(line);
        title = line.substring(startPos, regexRes?.index ?? line.length).trim();
        if (title.length > 0) columns.push({ title, pos: startPos });

        if (!regexRes || regexRes.length <= 0) break;
        const endPos = regexRes.index + regexRes[0].length;

        separator.lastIndex = endPos;
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

      resultRow[column.title] = value.replaceAll(separator, '').trim();
    }
    result.push(resultRow);
  }
  return result;
}
