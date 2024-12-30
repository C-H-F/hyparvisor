export type AsPrefixedConstArray<
  T extends readonly [string, ...string[]],
  U extends string,
> = {
  [K in keyof T]: `${U}${T[K]}`;
};

/**
 * Prefixes every value in an array of strings with a given prefix.
 * @param arr String values to add a prefix to.
 * @param prefix The prefix to add to each value.
 * @returns An array of strings with the prefix added to each value.
 */
export function constPrefix<
  T extends readonly [string, ...string[]],
  U extends string,
>(arr: T, prefix: U): AsPrefixedConstArray<T, U> {
  return arr.map((x) => `${prefix}${x}`) as AsPrefixedConstArray<T, U>;
}
