
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
  guilds?: string[];
  createdAt?: Timestamp;
}

export interface GuildMember extends UserProfile {
  role: GuildRole;
}

// Audit Log Types
export enum AuditActionType {
  MEMBER_ROLE_CHANGED = "MEMBER_ROLE_CHANGED",
  MEMBER_KICKED = "MEMBER_KICKED",
  MEMBER_JOINED = "MEMBER_JOINED",
  MEMBER_LEFT = "MEMBER_LEFT", // User voluntarily left
  GUILD_SETTINGS_UPDATED = "GUILD_SETTINGS_UPDATED",
  GUILD_BANNER_UPDATED = "GUILD_BANNER_UPDATED",
  GUILD_LOGO_UPDATED = "GUILD_LOGO_UPDATED",
  EVENT_CREATED = "EVENT_CREATED",
  EVENT_UPDATED = "EVENT_UPDATED",
  EVENT_DELETED = "EVENT_DELETED",
  ACHIEVEMENT_CREATED = "ACHIEVEMENT_CREATED", // For future use
  ACHIEVEMENT_UPDATED = "ACHIEVEMENT_UPDATED", // For future use
  ACHIEVEMENT_DELETED = "ACHIEVEMENT_DELETED", // For future use
  // Add more actions as needed
}

export interface AuditLogDetails {
  targetUserId?: string;
  targetUserDisplayName?: string;
  oldValue?: string | GuildRole;
  newValue?: string | GuildRole;
  fieldName?: string; // For GUILD_SETTINGS_UPDATED
  kickedUserRole?: GuildRole;
  eventName?: string;
  eventId?: string;
  achievementName?: string;
  achievementId?: string;
  // Extend with other specific details for different actions
}

export interface AuditLogEntry {
  id?: string; // Firestore document ID
  timestamp: Timestamp;
  actorId: string;
  actorDisplayName: string | null;
  action: AuditActionType;
  details?: AuditLogDetails;
}
