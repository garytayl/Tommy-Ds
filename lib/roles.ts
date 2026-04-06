export type RawProfileRole = string | null | undefined;

/**
 * We historically used "installer" for field users, but some deployments/users
 * refer to the same role as "field". Treat them as equivalent.
 */
export function isFieldRole(role: RawProfileRole): boolean {
  return role === "installer" || role === "field";
}

export function isOfficeRole(role: RawProfileRole): boolean {
  return role === "admin" || role === "manager";
}
