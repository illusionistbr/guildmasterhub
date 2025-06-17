
import type { Guild, GuildPermission, CustomRole } from '@/types/guildmaster';

/**
 * Checks if a user with a given roleName has a specific permission.
 *
 * @param roleName The name of the user's role.
 * @param customRoles The guild's customRoles object.
 * @param requiredPermission The permission to check for.
 * @returns True if the user has the permission, false otherwise.
 */
export function hasPermission(
  roleName: string | undefined | null,
  customRoles: Guild['customRoles'] | undefined | null,
  requiredPermission: GuildPermission
): boolean {
  if (!roleName || !customRoles) {
    return false;
  }

  const role = customRoles[roleName];
  if (!role || !role.permissions) {
    return false;
  }

  return role.permissions.includes(requiredPermission);
}

/**
 * Retrieves all permissions for a given roleName.
 *
 * @param roleName The name of the user's role.
 * @param customRoles The guild's customRoles object.
 * @returns An array of GuildPermission for the role, or an empty array if not found.
 */
export function getPermissionsForRole(
  roleName: string | undefined | null,
  customRoles: Guild['customRoles'] | undefined | null,
): GuildPermission[] {
  if (!roleName || !customRoles) {
    return [];
  }
  const role = customRoles[roleName];
  return role?.permissions || [];
}

/**
 * Checks if the user is the owner of the guild.
 * This is a direct check against the guild's ownerId field,
 * separate from the dynamic role system.
 *
 * @param userId The UID of the user to check.
 * @param guild The guild object.
 * @returns True if the user is the owner, false otherwise.
 */
export function isGuildOwner(userId: string | undefined | null, guild: Guild | undefined | null): boolean {
    if (!userId || !guild) {
        return false;
    }
    return guild.ownerId === userId;
}

