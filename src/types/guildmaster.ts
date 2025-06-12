
import type { Timestamp } from 'firebase/firestore';

export enum GuildRole {
  Leader = "Líder",
  ViceLeader = "Vice-Líder",
  Counselor = "Conselheiro",
  Officer = "Oficial",
  Member = "Membro",
}

export interface Guild {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  bannerUrl?: string;
  logoUrl?: string;
  ownerId: string;
  ownerDisplayName?: string;
  memberIds?: string[];
  game?: string;
  tags?: string[];
  createdAt?: Date | Timestamp;
  password?: string;
  isOpen?: boolean;
  socialLinks?: {
    facebook?: string;
    x?: string;
    youtube?: string;
    discord?: string;
  };
  roles?: { [userId: string]: GuildRole };
}

export interface Event {
  id: string;
  guildId: string;
  title: string;
  description: string;
  date: string; // ISO date string
  time: string; // e.g., "19:00"
  location?: string;
  organizerId: string;
  attendeeIds?: string[];
}

export interface Achievement {
  id: string;
  guildId: string;
  title: string;
  description: string;
  dateAchieved: string; // ISO date string
  category: string; // e.g., "PvP", "Raid", "Community"
  achievedByIds?: string[]; // Members who contributed
}

export interface Application {
  id: string;
  guildId: string;
  applicantId: string; // User ID of the applicant
  applicantName: string;
  answers: Record<string, string>; // Answers to custom form questions
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string; // ISO date string
  reviewedBy?: string; // Admin User ID
  reviewedAt?: string; // ISO date string
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  guilds?: string[]; // IDs of guilds the user is a member of
  createdAt?: Timestamp;
  lastNotificationsCheckedTimestamp?: {
    [guildId: string]: Timestamp;
  };
}

export interface GuildMember extends UserProfile {
  role: GuildRole;
}

// Audit Log Types
export enum AuditActionType {
  MEMBER_ROLE_CHANGED = "MEMBER_ROLE_CHANGED",
  MEMBER_KICKED = "MEMBER_KICKED",
  MEMBER_JOINED = "MEMBER_JOINED",
  MEMBER_LEFT = "MEMBER_LEFT",
  GUILD_SETTINGS_UPDATED = "GUILD_SETTINGS_UPDATED", 
  GUILD_NAME_UPDATED = "GUILD_NAME_UPDATED",
  GUILD_DESCRIPTION_UPDATED = "GUILD_DESCRIPTION_UPDATED",
  GUILD_PASSWORD_UPDATED = "GUILD_PASSWORD_UPDATED", 
  GUILD_VISIBILITY_CHANGED = "GUILD_VISIBILITY_CHANGED", 
  GUILD_BANNER_UPDATED = "GUILD_BANNER_UPDATED",
  GUILD_LOGO_UPDATED = "GUILD_LOGO_UPDATED",
  GUILD_DELETED = "GUILD_DELETED",
  EVENT_CREATED = "EVENT_CREATED",
  EVENT_UPDATED = "EVENT_UPDATED",
  EVENT_DELETED = "EVENT_DELETED",
  ACHIEVEMENT_CREATED = "ACHIEVEMENT_CREATED",
  ACHIEVEMENT_UPDATED = "ACHIEVEMENT_UPDATED",
  ACHIEVEMENT_DELETED = "ACHIEVEMENT_DELETED",
  // Notification related actions could be added if needed for audit, but notifications themselves are separate
}

export interface AuditLogDetails {
  targetUserId?: string;
  targetUserDisplayName?: string;
  oldValue?: string | GuildRole | boolean;
  newValue?: string | GuildRole | boolean;
  fieldName?: string;
  kickedUserRole?: GuildRole;
  eventName?: string;
  eventId?: string;
  achievementName?: string;
  achievementId?: string;
  changedField?: 'name' | 'password' | 'description' | 'visibility' | 'game' | 'socialLinks';
}

export interface AuditLogEntry {
  id?: string; // Firestore document ID
  timestamp: Timestamp;
  actorId: string;
  actorDisplayName: string | null;
  action: AuditActionType;
  details?: AuditLogDetails;
}

// In-App Notification Types
export type NotificationType = "MANDATORY_ACTIVITY_CREATED" | "GENERIC_INFO" | "GUILD_UPDATE";

export interface AppNotification {
  id: string; // Firestore document ID
  guildId: string;
  message: string;
  type: NotificationType;
  link: string; // URL to navigate to on click
  timestamp: Timestamp;
  details?: {
    activityTitle?: string;
    activityDate?: string; // Formatted date for display
    eventId?: string;
  };
  createdByUserId?: string;
  createdByUserDisplayname?: string | null;
  // No 'read' field directly on the notification document for guild-wide notifications.
  // 'Read' status is managed by 'lastNotificationsCheckedTimestamp' on UserProfile per guild.
}
