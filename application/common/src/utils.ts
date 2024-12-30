/**
 * A map function (like Array.map) for objects.
 * Calls a defined callback function on each value of an object, and returns a new object with key and value returned for every entry.
 * @param obj Object to remap
 * @param callbackfn A function that accepts two arguments.
 *   The map method calls the callbackfn function one time for each element in the object.
 * @returns A new object with the remapped keys and values.
 */
export function mapObject<
  KI extends string | number | symbol,
  VI,
  KO extends string | number | symbol,
  VO
>(
  obj: Record<KI, VI>,
  callbackfn: (key: KI, value: VI) => [key: KO, value: VO]
) {
  const result: Record<KO, VO> = {} as any;
  for (const key in obj) {
    const [newKey, value] = callbackfn(key, obj[key]);
    result[newKey] = value;
  }
  return result;
}

/**
 * A map function (like Array.map) for object values.
 * Calls a defined callback function on each value of an object, and returns a new object that contains the new values.
 * @param obj Object to remap.
 * @param callbackfn A function that accepts two arguments.
 *   The map method calls the callbackfn function one time for each element in the object.
 * @returns A new object with the remapped values.
 */
export function mapObjectValues<K extends string | number | symbol, V, VO>(
  obj: Record<K, V>,
  callbackfn: (value: V, key: K) => VO
) {
  return mapObject(obj, (key, value) => [key, callbackfn(value, key)]);
}
