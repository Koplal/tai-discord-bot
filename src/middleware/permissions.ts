import type { GuildMember } from 'discord.js';
import type { RolePermission, UserTier } from '../types.js';

/**
 * Role ID to permission mapping
 *
 * TODO: Move to environment variables or database for production
 * Replace these with actual Discord role IDs from your server
 */
const ROLE_PERMISSIONS: Map<string, RolePermission> = new Map([
  // Example: Admin role
  [
    'ADMIN_ROLE_ID', // Replace with actual role ID
    {
      roleId: 'ADMIN_ROLE_ID',
      tier: 'admin',
      features: [
        'basic_chat',
        'linear_access',
        'linear_create',
        'linear_update',
        'supabase_query',
        'notion_search',
        'admin_tools',
      ],
      requestsPerMin: 1000,
      maxTokensPerDay: Infinity,
    },
  ],
  // Example: Developer role
  [
    'DEVELOPER_ROLE_ID', // Replace with actual role ID
    {
      roleId: 'DEVELOPER_ROLE_ID',
      tier: 'premium',
      features: [
        'basic_chat',
        'linear_access',
        'linear_create',
        'linear_update',
        'supabase_query',
        'notion_search',
      ],
      requestsPerMin: 60,
      maxTokensPerDay: 500000,
    },
  ],
  // Example: Member role
  [
    'MEMBER_ROLE_ID', // Replace with actual role ID
    {
      roleId: 'MEMBER_ROLE_ID',
      tier: 'free',
      features: ['basic_chat', 'linear_create', 'notion_search'],
      requestsPerMin: 10,
      maxTokensPerDay: 50000,
    },
  ],
]);

/**
 * Default permissions for users without mapped roles
 */
const DEFAULT_PERMISSION: RolePermission = {
  roleId: 'default',
  tier: 'free',
  features: ['basic_chat'],
  requestsPerMin: 10,
  maxTokensPerDay: 50000,
};

/**
 * Check if a user has permission to access a feature
 */
export function checkPermissions(
  member: GuildMember | null,
  feature: string
): { allowed: boolean; tier: UserTier; reason?: string } {
  // Get user's highest tier permission
  const permission = getUserPermission(member);

  // Check if the feature is in the allowed list
  if (permission.features.includes(feature)) {
    return { allowed: true, tier: permission.tier };
  }

  // Provide helpful error messages
  const featureDescriptions: Record<string, string> = {
    basic_chat: 'basic chat access',
    linear_access: 'Linear read access',
    linear_create: 'Linear issue creation',
    linear_update: 'Linear issue updates',
    supabase_query: 'database queries',
    notion_search: 'Notion search',
    admin_tools: 'admin tools',
  };

  const featureDesc = featureDescriptions[feature] ?? feature;

  return {
    allowed: false,
    tier: permission.tier,
    reason: `You don't have permission for ${featureDesc}. Contact an admin to upgrade your access.`,
  };
}

/**
 * Get the highest permission level for a user
 */
export function getUserPermission(member: GuildMember | null): RolePermission {
  if (!member) return DEFAULT_PERMISSION;

  // Priority order: admin > premium > free
  const tierPriority: UserTier[] = ['admin', 'premium', 'free'];

  for (const tier of tierPriority) {
    for (const [roleId, permission] of ROLE_PERMISSIONS) {
      if (permission.tier === tier && member.roles.cache.has(roleId)) {
        return permission;
      }
    }
  }

  return DEFAULT_PERMISSION;
}

/**
 * Check if a user is an admin
 */
export function isAdmin(member: GuildMember | null): boolean {
  if (!member) return false;

  for (const [roleId, permission] of ROLE_PERMISSIONS) {
    if (permission.tier === 'admin' && member.roles.cache.has(roleId)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all features available to a user
 */
export function getAvailableFeatures(member: GuildMember | null): string[] {
  const permission = getUserPermission(member);
  return permission.features;
}

/**
 * Update role permissions (for dynamic configuration)
 */
export function setRolePermission(roleId: string, permission: RolePermission): void {
  ROLE_PERMISSIONS.set(roleId, permission);
}

/**
 * Remove a role permission
 */
export function removeRolePermission(roleId: string): boolean {
  return ROLE_PERMISSIONS.delete(roleId);
}

/**
 * Get all configured role permissions
 */
export function getAllRolePermissions(): RolePermission[] {
  return Array.from(ROLE_PERMISSIONS.values());
}
