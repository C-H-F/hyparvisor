export function toAbsoluteUrl(url: string) {
  if (url.indexOf('://') >= 0) return url;
  if (url.startsWith('/')) return window.location.origin + url;
  return window.location.origin + window.location.pathname + '/' + url;
}

export function toAbsoluteWebsocketUrl(url: string) {
  return toAbsoluteUrl(url).replace(/^http/, 'ws');
}

export function range(
  start: number,
  end: number | null = null,
  step: number | null = null
) {
  if (end === null) {
    end = start;
    start = 0;
  }
  if (step === null) step = end > start ? 1 : -1;
  const numStep = step;
  return [...Array(Math.floor((end - start) / step))].map(
    (_, i) => start + i * numStep
  );
}

export function endsWithNumber(str: string) {
  return !isNaN(+str.slice(-1));
}

export function equalsIgnoreCase(a: string, b: string) {
  if (a.length != b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a.charAt(i).toLowerCase() !== b.charAt(i).toLowerCase()) return false;
  }
  return true;
}

export function downloadFile(
  name: string,
  contents: string,
  mimeType = 'text/plain'
) {
  const blob = new Blob([contents], { type: mimeType });
  const a = document.createElement('a');
  a.download = name;
  a.href = window.URL.createObjectURL(blob);
  a.click();
  a.remove();
}

export function combinePath(...elements: string[]) {
  let result = '';
  for (const e of elements) result += e.endsWith('/') ? e : e + '/';
  return result.substring(0, result.length - 1);
}

export function singularPlural(
  count: number,
  singular: string | ((count: number) => string),
  plural: string | ((count: number) => string)
) {
  return count === 1
    ? typeof singular === 'function'
      ? singular(count)
      : singular
    : typeof plural === 'function'
      ? plural(count)
      : plural;
}

export function floor(num: number, precision: number) {
  const factor = 10 ** precision;
  return Math.floor(num * factor) / factor;
}
