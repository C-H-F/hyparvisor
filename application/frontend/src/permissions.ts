import { z } from 'zod';
import { AsPrefixedConstArray, constPrefix } from './lib/const-utils';
import { mapObjectValues } from '../../common/src/utils';

const zPermissionGroup = z.object({
  system: z.enum(['statistics', 'update', 'terminal']),
  vm: z.enum(['create', 'read', 'update', 'delete']),
  storage: z.enum(['create', 'read', 'update', 'delete']),
  user: z.enum(['create', 'read', 'update', 'delete']),
});
export const zRootPermission = zPermissionGroup.keyof();
export type RootPermission = z.infer<typeof zRootPermission>;

type PermissionShape = typeof zPermissionGroup.shape;

// type PermissionGroup = {
//   [K in keyof PermissionShape]: `${K}.${PermissionShape[K]['options'][number]}`[];
// };

type PrefixedPermissionGroup = {
  [K in keyof PermissionShape]: z.ZodEnum<
    //AsPrefixedConstArray<PermissionShape[K]['options'], `${K}.`>
    AsPrefixedConstArray<
      PermissionShape[K]['options'] extends string[]
        ? PermissionShape[K]['options']
        : never,
      `${K}.`
    > extends infer Result
      ? Result extends [string, ...string[]]
        ? Result
        : never
      : never
  >;
};

export const zPrefixedPermissionGroup = z.object(
  mapObjectValues(zPermissionGroup.shape, (v, k) =>
    z.enum(v.options.map((x) => `${k}.${x}`) as any)
  ) as PrefixedPermissionGroup
);

export const zSubPermission = z.enum([
  ...zPrefixedPermissionGroup.shape[zRootPermission.options[0]].options,
  ...zPrefixedPermissionGroup.shape[zRootPermission.options[1]].options,
  ...zPrefixedPermissionGroup.shape[zRootPermission.options[2]].options,
  ...zPrefixedPermissionGroup.shape[zRootPermission.options[3]].options,
]);

export type SubPermission = z.infer<typeof zSubPermission>;

const zPermission = z.union([zRootPermission, zSubPermission]);
export type Permission = z.infer<typeof zPermission>;

export function expandPermissions(permission: Permission[]) {
  const result = new Set<SubPermission>();
  const rootPermissions = zRootPermission.options;
  for (const p of permission) {
    if (!rootPermissions.includes(p as any)) {
      result.add(p as SubPermission);
      continue;
    }
    zPrefixedPermissionGroup.shape[p as RootPermission].options.forEach((sub) =>
      result.add(sub as SubPermission)
    );
  }
  console.log(permission, result);
  return [...result];
}

export function collapsePermissions(permissions: Permission[]) {
  const result = new Set<Permission>();
  const rootPermissions = zRootPermission.options;
  for (const root of rootPermissions) {
    let complete = true;
    for (const sub of zPrefixedPermissionGroup.shape[root].options) {
      if (!permissions.includes(sub as Permission)) {
        complete = false;
        break;
      }
    }
    if (complete) {
      result.add(root as RootPermission);
      for (const sub of zPermissionGroup.shape[root].options)
        result.delete(sub as Permission);
    }
  }
  return [...result];
}

export function parsePermissions(permissions: string[]) {
  return permissions
    .map((p) => {
      const result = zPermission.safeParse(p);
      if (result.success) return result.data;
      return null;
    })
    .filter((x) => x) as Permission[];
}
