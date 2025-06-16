
import type { Timestamp } from 'firebase/firestore';

export enum GuildRole {
  Leader = "Líder",
  ViceLeader = "Vice-Líder",
  Counselor = "Conselheiro",
  Officer = "Oficial",
  Member = "Membro",
}

export enum TLRole {
  Tank = "Tank",
  Healer = "Healer",
  DPS = "DPS",
}

export enum TLWeapon {
  SwordAndShield = "Sword and Shield",
  Greatsword = "Greatsword",
  Daggers = "Daggers",
  Crossbow = "Crossbow",
  Bow = "Bow",
  Staff = "Staff",
  WandAndTome = "Wand and Tome",
  Spear = "Spear",
}

export type MemberStatus = 'Ativo' | 'Inativo' | 'Licença';

export interface GuildMemberRoleInfo {
  generalRole: GuildRole;
  tlRole?: TLRole;
  tlPrimaryWeapon?: TLWeapon;
  tlSecondaryWeapon?: TLWeapon;
  notes?: string;
  status?: MemberStatus;
  dkpBalance?: number;
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
  roles?: { [userId: string]: GuildMemberRoleInfo | GuildRole };
}

export interface Event {
  id: string;
  guildId: string;
  title: string;
  description?: string;
  date: string; 
  time: string; 
  endDate?: string; 
  endTime?: string; 
  location?: string;
  organizerId: string;
  attendeeIds?: string[];
  dkpValue?: number;
  requiresPin?: boolean;
  pinCode?: string;
  attendeesWithPin?: string[];
  category?: string; 
  subCategory?: string; 
}

export interface Achievement {
  id: string;
  guildId: string;
  title: string;
  description: string;
  dateAchieved: string;
  category: string;
  achievedByIds?: string[];
}

export interface Application {
  id: string;
  guildId: string;
  applicantId: string;
  applicantName: string;
  applicantDisplayName: string;
  applicantPhotoURL?: string | null;
  gearScore: number;
  gearScoreScreenshotUrl: string;
  tlRole?: TLRole;
  tlPrimaryWeapon?: TLWeapon;
  tlSecondaryWeapon?: TLWeapon;
  discordNick: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  submittedAt: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  guilds?: string[];
  createdAt?: Timestamp;
  lastNotificationsCheckedTimestamp?: {
    [guildId: string]: Timestamp;
  };
}

export interface GuildMember extends UserProfile {
  role: GuildRole;
  tlRole?: TLRole;
  tlPrimaryWeapon?: TLWeapon;
  tlSecondaryWeapon?: TLWeapon;
  notes?: string;
  weapons?: { mainHandIconUrl?: string; offHandIconUrl?: string };
  gearScore?: number;
  dkpBalance?: number;
  status?: MemberStatus;
}

export type GroupIconType = 'shield' | 'sword' | 'heart';

export interface GuildGroupMember {
  memberId: string;
  displayName: string;
  photoURL?: string | null;
  note?: string;
}

export interface GuildGroup {
  id: string;
  name: string;
  icon: GroupIconType;
  headerColor: string; 
  members: GuildGroupMember[];
  createdAt: Timestamp;
  createdBy: string; 
  guildId: string;
}


export enum AuditActionType {
  MEMBER_ROLE_CHANGED = "MEMBER_ROLE_CHANGED",
  MEMBER_STATUS_CHANGED = "MEMBER_STATUS_CHANGED",
  MEMBER_KICKED = "MEMBER_KICKED",
  MEMBER_JOINED = "MEMBER_JOINED",
  MEMBER_LEFT = "MEMBER_LEFT",
  MEMBER_NOTE_UPDATED = "MEMBER_NOTE_UPDATED",
  DKP_AWARDED_VIA_PIN = "DKP_AWARDED_VIA_PIN",
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
  APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED",
  APPLICATION_ACCEPTED = "APPLICATION_ACCEPTED",
  APPLICATION_REJECTED = "APPLICATION_REJECTED",
  GROUP_CREATED = "GROUP_CREATED",
  GROUP_UPDATED = "GROUP_UPDATED",
  GROUP_DELETED = "GROUP_DELETED",
}

export interface AuditLogDetails {
  targetUserId?: string;
  targetUserDisplayName?: string;
  oldValue?: string | GuildRole | boolean | TLRole | TLWeapon | MemberStatus;
  newValue?: string | GuildRole | boolean | TLRole | TLWeapon | MemberStatus;
  fieldName?: string;
  kickedUserRole?: GuildRole;
  eventName?: string;
  eventId?: string;
  achievementName?: string;
  achievementId?: string;
  changedField?: 'name' | 'password' | 'description' | 'visibility' | 'game' | 'socialLinks' | 'notes' | 'tlRole' | 'tlPrimaryWeapon' | 'tlSecondaryWeapon' | 'status';
  noteSummary?: string;
  applicationId?: string;
  dkpValueAwarded?: number;
  groupId?: string;
  groupName?: string;
  details?: {
    joinMethod?: 'direct_public_non_tl' | 'public_form_join' | 'application_approved';
  };
}

export interface AuditLogEntry {
  id?: string;
  timestamp: Timestamp;
  actorId: string;
  actorDisplayName: string | null;
  action: AuditActionType;
  details?: AuditLogDetails;
}

export type NotificationType = "MANDATORY_ACTIVITY_CREATED" | "GENERIC_INFO" | "GUILD_UPDATE" | "APPLICATION_RECEIVED" | "APPLICATION_STATUS_CHANGED";

export interface AppNotification {
  id: string;
  guildId: string;
  message: string;
  type: NotificationType;
  link: string;
  timestamp: Timestamp;
  details?: {
    activityTitle?: string;
    activityDate?: string;
    eventId?: string;
    applicationId?: string;
    applicantName?: string;
    newStatus?: 'approved' | 'rejected';
  };
  createdByUserId?: string;
  createdByUserDisplayname?: string | null;
  targetUserId?: string;
  isRead?: boolean;
}
