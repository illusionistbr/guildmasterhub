
import type { Timestamp } from 'firebase/firestore';

export enum GuildPermission {
  MANAGE_MEMBERS_VIEW = "MANAGE_MEMBERS_VIEW",
  MANAGE_MEMBERS_EDIT_ROLE = "MANAGE_MEMBERS_EDIT_ROLE",
  MANAGE_MEMBERS_EDIT_STATUS = "MANAGE_MEMBERS_EDIT_STATUS",
  MANAGE_MEMBERS_EDIT_NOTES = "MANAGE_MEMBERS_EDIT_NOTES",
  MANAGE_MEMBERS_KICK = "MANAGE_MEMBERS_KICK",
  MANAGE_EVENTS_CREATE = "MANAGE_EVENTS_CREATE",
  MANAGE_EVENTS_EDIT = "MANAGE_EVENTS_EDIT",
  MANAGE_EVENTS_DELETE = "MANAGE_EVENTS_DELETE",
  MANAGE_EVENTS_VIEW_PIN = "MANAGE_EVENTS_VIEW_PIN",
  MANAGE_GUILD_SETTINGS_GENERAL = "MANAGE_GUILD_SETTINGS_GENERAL",
  MANAGE_GUILD_SETTINGS_APPEARANCE = "MANAGE_GUILD_SETTINGS_APPEARANCE",
  MANAGE_ROLES_PERMISSIONS = "MANAGE_ROLES_PERMISSIONS",
  MANAGE_GROUPS_CREATE = "MANAGE_GROUPS_CREATE",
  MANAGE_GROUPS_EDIT = "MANAGE_GROUPS_EDIT",
  MANAGE_GROUPS_DELETE = "MANAGE_GROUPS_DELETE",
  VIEW_AUDIT_LOG = "VIEW_AUDIT_LOG",
  MANAGE_RECRUITMENT_VIEW_APPLICATIONS = "MANAGE_RECRUITMENT_VIEW_APPLICATIONS",
  MANAGE_RECRUITMENT_PROCESS_APPLICATIONS = "MANAGE_RECRUITMENT_PROCESS_APPLICATIONS",
  VIEW_MEMBER_DETAILED_INFO = "VIEW_MEMBER_DETAILED_INFO",
  MANAGE_DKP_SETTINGS = "MANAGE_DKP_SETTINGS",
  MANAGE_DKP_DECAY_SETTINGS = "MANAGE_DKP_DECAY_SETTINGS",
  MANAGE_MANUAL_CONFIRMATIONS_APPROVE = "MANAGE_MANUAL_CONFIRMATIONS_APPROVE", // New permission
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
  Longbow = "Longbow",
  Staff = "Staff",
  WandAndTome = "Wand and Tome",
  Spear = "Spear",
}

export type MemberStatus = 'Ativo' | 'Inativo' | 'Licença';

export interface GuildMemberRoleInfo {
  roleName: string;
  characterNickname?: string;
  gearScore?: number;
  gearScoreScreenshotUrl?: string | null;
  gearBuildLink?: string | null;
  skillBuildLink?: string | null;
  tlRole?: TLRole;
  tlPrimaryWeapon?: TLWeapon;
  tlSecondaryWeapon?: TLWeapon;
  notes?: string;
  status?: MemberStatus;
  dkpBalance?: number;
}

export interface CustomRole {
  permissions: GuildPermission[];
  description?: string;
}

export interface RecruitmentQuestion {
  id: string;
  text: string;
  type: 'default' | 'custom';
  isEnabled: boolean;
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
  region?: string;
  server?: string;
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
  roles?: { [userId: string]: GuildMemberRoleInfo };
  customRoles?: { [roleName: string]: CustomRole };
  recruitmentQuestions?: RecruitmentQuestion[];
  dkpSystemEnabled?: boolean;
  dkpRedemptionWindow?: {
    value: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  dkpDefaultsPerCategory?: {
    [categoryKey: string]: number;
  };
  dkpDecayEnabled?: boolean;
  dkpDecayPercentage?: number;
  dkpDecayIntervalDays?: number;
  dkpDecayInitialDate?: Timestamp;
  lastDkpDecayTimestamp?: Timestamp;
  tlGuildFocus?: string[]; // New field for TL guild focus
}

export interface Event {
  id: string;
  guildId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  endDate?: string; // YYYY-MM-DD
  endTime?: string; // HH:MM
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

export interface ManualConfirmation {
  id?: string; // Firestore document ID, if needed standalone
  userId: string;
  userDisplayName: string | null;
  eventId: string;
  eventTitle: string;
  screenshotUrl: string;
  notes?: string;
  submittedAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string | null; // UID of admin
  reviewedAt?: Timestamp | null;
  rejectionReason?: string | null;
  dkpAwarded?: number; // DKP awarded upon approval
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
  gearScoreScreenshotUrl: string | null;
  tlRole?: TLRole;
  tlPrimaryWeapon?: TLWeapon;
  tlSecondaryWeapon?: TLWeapon;
  discordNick: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  submittedAt: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  customAnswers?: { [questionId: string]: string };
  applicantTlRegion?: string; // New field
  applicantTlServer?: string; // New field
  applicantTlGameFocus?: string[]; // New field
  knowsSomeoneInGuild?: string; // New field
  additionalNotes?: string; // New field
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
  roleName: string;
  characterNickname?: string;
  gearScore?: number;
  gearScoreScreenshotUrl?: string | null;
  gearBuildLink?: string | null;
  skillBuildLink?: string | null;
  tlRole?: TLRole;
  tlPrimaryWeapon?: TLWeapon;
  tlSecondaryWeapon?: TLWeapon;
  notes?: string;
  weapons?: { mainHandIconUrl?: string; offHandIconUrl?: string };
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
  MEMBER_GUILD_PROFILE_UPDATED = "MEMBER_GUILD_PROFILE_UPDATED",
  DKP_AWARDED_VIA_PIN = "DKP_AWARDED_VIA_PIN",
  DKP_SETTINGS_UPDATED = "DKP_SETTINGS_UPDATED",
  DKP_DECAY_SETTINGS_UPDATED = "DKP_DECAY_SETTINGS_UPDATED",
  DKP_ON_DEMAND_DECAY_TRIGGERED = "DKP_ON_DEMAND_DECAY_TRIGGERED",
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
  RECRUITMENT_QUESTIONNAIRE_UPDATED = "RECRUITMENT_QUESTIONNAIRE_UPDATED",
  GROUP_CREATED = "GROUP_CREATED",
  GROUP_UPDATED = "GROUP_UPDATED",
  GROUP_DELETED = "GROUP_DELETED",
  CUSTOM_ROLE_CREATED = "CUSTOM_ROLE_CREATED",
  CUSTOM_ROLE_UPDATED = "CUSTOM_ROLE_UPDATED",
  CUSTOM_ROLE_DELETED = "CUSTOM_ROLE_DELETED",
  PERMISSIONS_UPDATED_FOR_ROLE = "PERMISSIONS_UPDATED_FOR_ROLE",
  MANUAL_CONFIRMATION_SUBMITTED = "MANUAL_CONFIRMATION_SUBMITTED",
  MANUAL_CONFIRMATION_APPROVED = "MANUAL_CONFIRMATION_APPROVED",
  MANUAL_CONFIRMATION_REJECTED = "MANUAL_CONFIRMATION_REJECTED",
}

export interface AuditLogDetails {
  targetUserId?: string;
  targetUserDisplayName?: string;
  oldValue?: string | boolean | TLRole | TLWeapon | MemberStatus | GuildPermission[] | number | Date;
  newValue?: string | boolean | TLRole | TLWeapon | MemberStatus | GuildPermission[] | number | Date;
  fieldName?: string;
  kickedUserRoleName?: string;
  eventName?: string;
  eventId?: string;
  achievementName?: string;
  achievementId?: string;
  changedField?: 'name' | 'password' | 'description' | 'visibility' | 'game' | 'socialLinks' | 'notes' | 'tlRole' | 'tlPrimaryWeapon' | 'tlSecondaryWeapon' | 'status' | 'roleName' | 'customRoles' | 'recruitmentQuestions' | 'characterNickname' | 'gearScore' | 'gearScoreScreenshotUrl' | 'gearBuildLink' | 'skillBuildLink' | 'region' | 'server' | 'dkpSystemEnabled' | 'dkpRedemptionWindow' | 'dkpDefaultsPerCategory' | 'dkpDecayEnabled' | 'dkpDecayPercentage' | 'dkpDecayIntervalDays' | 'dkpDecayInitialDate';
  noteSummary?: string;
  applicationId?: string;
  dkpValueAwarded?: number;
  decayPercentage?: number;
  affectedMembersCount?: number;
  groupId?: string;
  groupName?: string;
  roleName?: string;
  permissions?: GuildPermission[];
  manualConfirmationId?: string;
  screenshotUrl?: string;
  details?: {
    joinMethod?: 'direct_public_non_tl' | 'public_form_join' | 'application_approved';
    questionnaireChangeSummary?: string;
    updatedFields?: string[];
    decayType?: 'on_demand' | 'scheduled';
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

export interface DkpDecayLogEntry {
  id?: string;
  timestamp: Timestamp;
  type: 'scheduled' | 'on_demand';
  percentage: number;
  triggeredByUserId?: string; // User for on-demand, 'system' for scheduled
  triggeredByDisplayName?: string | null;
  affectedMembersCount: number;
  status: 'completed' | 'failed' | 'in_progress';
  details?: string; // e.g., error message if failed
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



    