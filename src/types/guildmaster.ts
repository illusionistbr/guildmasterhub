

import type { Timestamp } from 'firebase/firestore';

export enum GuildPermission {
  MANAGE_MEMBERS_VIEW = "MANAGE_MEMBERS_VIEW",
  MANAGE_MEMBERS_EDIT_ROLE = "MANAGE_MEMBERS_EDIT_ROLE",
  MANAGE_MEMBERS_EDIT_STATUS = "MANAGE_MEMBERS_EDIT_STATUS",
  MANAGE_MEMBERS_EDIT_NOTES = "MANAGE_MEMBERS_EDIT_NOTES",
  MANAGE_MEMBERS_KICK = "MANAGE_MEMBERS_KICK",
  MANAGE_MEMBERS_ASSIGN_SUB_GUILD = "MANAGE_MEMBERS_ASSIGN_SUB_GUILD",
  MANAGE_EVENTS_CREATE = "MANAGE_EVENTS_CREATE",
  MANAGE_EVENTS_EDIT = "MANAGE_EVENTS_EDIT",
  MANAGE_EVENTS_DELETE = "MANAGE_EVENTS_DELETE",
  MANAGE_EVENTS_VIEW_PIN = "MANAGE_EVENTS_VIEW_PIN",
  MANAGE_GUILD_SETTINGS_GENERAL = "MANAGE_GUILD_SETTINGS_GENERAL",
  MANAGE_GUILD_SETTINGS_APPEARANCE = "MANAGE_GUILD_SETTINGS_APPEARANCE",
  MANAGE_ROLES_PERMISSIONS = "MANAGE_ROLES_PERMISSIONS",
  MANAGE_SUB_GUILDS = "MANAGE_SUB_GUILDS",
  MANAGE_GROUPS_CREATE = "MANAGE_GROUPS_CREATE",
  MANAGE_GROUPS_EDIT = "MANAGE_GROUPS_EDIT",
  MANAGE_GROUPS_DELETE = "MANAGE_GROUPS_DELETE",
  VIEW_AUDIT_LOG = "VIEW_AUDIT_LOG",
  MANAGE_RECRUITMENT_VIEW_APPLICATIONS = "MANAGE_RECRUITMENT_VIEW_APPLICATIONS",
  MANAGE_RECRUITMENT_PROCESS_APPLICATIONS = "MANAGE_RECRUITMENT_PROCESS_APPLICATIONS",
  VIEW_MEMBER_DETAILED_INFO = "VIEW_MEMBER_DETAILED_INFO",
  MANAGE_DKP_SETTINGS = "MANAGE_DKP_SETTINGS",
  MANAGE_DKP_DECAY_SETTINGS = "MANAGE_DKP_DECAY_SETTINGS",
  MANAGE_MANUAL_CONFIRMATIONS_APPROVE = "MANAGE_MANUAL_CONFIRMATIONS_APPROVE",
  MANAGE_MEMBER_DKP_BALANCE = "MANAGE_MEMBER_DKP_BALANCE",
  MANAGE_LOOT_BANK_ADD = "MANAGE_LOOT_BANK_ADD",
  MANAGE_LOOT_BANK_MANAGE = "MANAGE_LOOT_BANK_MANAGE",
  MANAGE_LOOT_AUCTIONS_CREATE = "MANAGE_LOOT_AUCTIONS_CREATE",
  MANAGE_LOOT_AUCTIONS_EDIT = "MANAGE_LOOT_AUCTIONS_EDIT",
  MANAGE_LOOT_AUCTIONS_DELETE = "MANAGE_LOOT_AUCTIONS_DELETE",
  MANAGE_LOOT_ROLLS_CREATE = "MANAGE_LOOT_ROLLS_CREATE",
  MANAGE_LOOT_ROLLS_MANAGE = "MANAGE_LOOT_ROLLS_MANAGE",
  MANAGE_LOOT_SETTINGS = "MANAGE_LOOT_SETTINGS",
  MANAGE_BILLING = "MANAGE_BILLING",
  MANAGE_GEAR_SCREENSHOT_REQUESTS = "MANAGE_GEAR_SCREENSHOT_REQUESTS",
  MANAGE_VOD_REVIEWS = "MANAGE_VOD_REVIEWS",
}

export enum TLRole {
  Tank = "Tank",
  Healer = "Healer",
  DPS = "DPS",
}

export enum TLWeapon {
  SwordAndShield = "Sword & Shield",
  Greatsword = "Greatsword",
  Daggers = "Daggers",
  Crossbow = "Crossbow",
  Longbow = "Longbow",
  Staff = "Staff",
  WandAndTome = "Wand & Tome",
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
  gearScreenshotUpdatedAt?: Timestamp;
  gearScreenshotUpdateRequest?: {
    requestedBy: string;
    requestedByDisplayName: string;
    requestedAt: Timestamp;
  } | null;
  subGuildId?: string;
}

export interface CustomRole {
  permissions: GuildPermission[];
  description?: string;
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
  tlGuildFocus?: string[];
  plan?: 'free' | 'pro';
  stripeCustomerId?: string;
  subGuildsEnabled?: boolean;
  subGuilds?: { id: string; name: string }[];
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
  id?: string; 
  userId: string;
  userDisplayName: string | null;
  eventId: string;
  eventTitle: string;
  screenshotUrl: string;
  notes?: string;
  submittedAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string | null; 
  reviewedAt?: Timestamp | null;
  rejectionReason?: string | null;
  dkpAwarded?: number;
}

export interface Achievement {
  id: string;
  guildId: string;
  title: string;
  description: string;
  icon: string;
  dateAchieved: string;
  category: string;
  achievedByIds?: string[];
}

export type PlayPeriod = 'Manhã' | 'Tarde' | 'Noite' | 'Manhã e Tarde' | 'Manhã e Noite' | 'Tarde e Noite' | 'Dia todo';

export interface Application {
  id: string;
  guildId: string;
  applicantId: string;
  applicantDisplayName: string;
  applicantPhotoURL?: string | null;
  
  characterNickname: string;
  gearScore: number;
  gearScoreScreenshotUrl?: string | null;
  gearBuildLink?: string | null;
  skillBuildLink?: string | null;
  tlRole: TLRole;
  tlPrimaryWeapon: TLWeapon;
  tlSecondaryWeapon: TLWeapon;
  gameFocus: string; 
  playTimePerDay: string;
  playPeriod: PlayPeriod;

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
  proTrialUsed?: boolean;
  isAdmin?: boolean;
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
  gearScreenshotUpdatedAt?: Timestamp;
  gearScreenshotUpdateRequest?: {
    requestedBy: string;
    requestedByDisplayName: string;
    requestedAt: Timestamp;
  } | null;
  subGuildId?: string;
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
  MEMBER_ASSIGNED_TO_SUB_GUILD = "MEMBER_ASSIGNED_TO_SUB_GUILD",
  DKP_AWARDED_VIA_PIN = "DKP_AWARDED_VIA_PIN",
  DKP_SETTINGS_UPDATED = "DKP_SETTINGS_UPDATED",
  DKP_DECAY_SETTINGS_UPDATED = "DKP_DECAY_SETTINGS_UPDATED",
  DKP_ON_DEMAND_DECAY_TRIGGERED = "DKP_ON_DEMAND_DECAY_TRIGGERED",
  MEMBER_DKP_ADJUSTED = "MEMBER_DKP_ADJUSTED", // New Audit Action
  GUILD_SETTINGS_UPDATED = "GUILD_SETTINGS_UPDATED",
  GUILD_NAME_UPDATED = "GUILD_NAME_UPDATED",
  GUILD_DESCRIPTION_UPDATED = "GUILD_DESCRIPTION_UPDATED",
  GUILD_PASSWORD_UPDATED = "GUILD_PASSWORD_UPDATED",
  GUILD_VISIBILITY_CHANGED = "GUILD_VISIBILITY_CHANGED",
  GUILD_BANNER_UPDATED = "GUILD_BANNER_UPDATED",
  GUILD_LOGO_UPDATED = "GUILD_LOGO_UPDATED",
  GUILD_DELETED = "GUILD_DELETED",
  SUB_GUILDS_ENABLED = "SUB_GUILDS_ENABLED",
  SUB_GUILDS_DISABLED = "SUB_GUILDS_DISABLED",
  SUB_GUILD_CREATED = "SUB_GUILD_CREATED",
  SUB_GUILD_UPDATED = "SUB_GUILD_UPDATED",
  SUB_GUILD_DELETED = "SUB_GUILD_DELETED",
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
  AUCTION_FINALIZED = "AUCTION_FINALIZED",
  AUCTION_ITEM_DISTRIBUTED = "AUCTION_ITEM_DISTRIBUTED",
  LOOT_ROLL_CREATED = "LOOT_ROLL_CREATED",
  LOOT_ROLL_DELETED = "LOOT_ROLL_DELETED",
  LOOT_ROLL_FINALIZED = "LOOT_ROLL_FINALIZED",
  LOOT_ROLL_ITEM_DISTRIBUTED = "LOOT_ROLL_ITEM_DISTRIBUTED",
  LOOT_ROLL_PARTICIPATED = "LOOT_ROLL_PARTICIPATED",
  GEAR_SCREENSHOT_UPDATE_REQUESTED = "GEAR_SCREENSHOT_UPDATE_REQUESTED",
  VOD_SUBMITTED = "VOD_SUBMITTED",
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
  changedField?: 'name' | 'password' | 'description' | 'visibility' | 'game' | 'socialLinks' | 'notes' | 'tlRole' | 'tlPrimaryWeapon' | 'tlSecondaryWeapon' | 'status' | 'roleName' | 'customRoles' | 'recruitmentQuestions' | 'characterNickname' | 'gearScore' | 'gearScoreScreenshotUrl' | 'gearBuildLink' | 'skillBuildLink' | 'region' | 'server' | 'dkpSystemEnabled' | 'dkpRedemptionWindow' | 'dkpDefaultsPerCategory' | 'dkpDecayEnabled' | 'dkpDecayPercentage' | 'dkpDecayIntervalDays' | 'dkpDecayInitialDate' | 'tlGuildFocus' | 'subGuildsEnabled';
  noteSummary?: string;
  applicationId?: string;
  dkpValueAwarded?: number; // Existing
  dkpAmountChanged?: number; // New for DKP adjustment
  dkpAdjustmentReason?: string; // New for DKP adjustment
  oldDkpBalance?: number; // New for DKP adjustment
  newDkpBalance?: number; // New for DKP adjustment
  decayPercentage?: number;
  affectedMembersCount?: number;
  groupId?: string;
  groupName?: string;
  subGuildId?: string;
  subGuildName?: string;
  roleName?: string;
  permissions?: GuildPermission[];
  manualConfirmationId?: string;
  screenshotUrl?: string;
  itemName?: string;
  auctionId?: string;
  auctionWinnerId?: string;
  auctionWinningBid?: number;
  rollId?: string;
  rollCost?: number;
  rollWinnerId?: string;
  rollWinningValue?: number;
  rollValue?: number;
  details?: {
    joinMethod?: 'direct_public_non_tl' | 'public_form_join' | 'application_approved';
    questionnaireChangeSummary?: string;
    updatedFields?: string[];
    decayType?: 'on_demand' | 'scheduled';
    vodUrl?: string;
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
  triggeredByUserId?: string; 
  triggeredByDisplayName?: string | null;
  affectedMembersCount: number;
  status: 'completed' | 'failed' | 'in_progress';
  details?: string; 
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

export type BankItemStatus = 'Disponível' | 'Encerrado' | 'Em leilão' | 'Em rolagem' | 'Aguardando leilão' | 'Aguardando rolagem' | 'Distribuído';

export interface BankItem {
  id: string; // Document ID from Firestore
  createdAt: Timestamp;
  itemCategory: string;
  weaponType?: string;
  armorType?: string;
  accessoryType?: string;
  itemName?: string;
  trait?: string;
  imageUrl: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  status: BankItemStatus;
  droppedByMemberId?: string;
  droppedByMemberName?: string;
}

export type AuctionStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';

export enum BidType {
  Upgrade = "Upgrade",
  Trait = "Trait",
  Market = "Market",
}

export interface AuctionBid {
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: Timestamp;
  type: BidType;
}

export interface Auction {
  id: string; // Firestore document ID
  guildId: string;
  item: Omit<BankItem, 'id' | 'status' | 'createdAt'>;
  bankItemId: string;
  status: AuctionStatus;
  startingBid: number;
  minBidIncrement: number;
  currentBid: number;
  currentWinnerId?: string;
  currentHighestBidType?: BidType;
  bids: AuctionBid[];
  startTime: Timestamp;
  endTime: Timestamp;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  isDistributed?: boolean;
  roleRestriction?: TLRole | 'Geral';
  weaponRestriction?: TLWeapon | 'Geral';
  refundDkpToLosers: boolean;
}

export type LootRollStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';

export interface LootRollEntry {
  rollerId: string;
  rollerName: string;
  rollValue: number;
  timestamp: Timestamp;
}

export interface LootRoll {
  id: string;
  guildId: string;
  item: Omit<BankItem, 'id' | 'status' | 'createdAt'>;
  bankItemId: string;
  status: LootRollStatus;
  cost: number;
  rolls: LootRollEntry[];
  startTime: Timestamp;
  endTime: Timestamp;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  isDistributed?: boolean;
  roleRestriction?: TLRole | 'Geral';
  weaponRestriction?: TLWeapon | 'Geral';
  refundDkpToLosers: boolean;
  winnerId?: string;
  winningRoll?: number;
}

export interface VODSubmission {
  id: string;
  guildId: string;
  submittedByUserId: string;
  submittedByDisplayName: string;
  submittedByUserPhotoUrl?: string | null;
  youtubeUrl: string;
  eventName: string;
  eventDateTime: Timestamp;
  submittedAt: Timestamp;
  status: 'pending' | 'reviewed';
  reviewerId?: string;
  reviewerDisplayName?: string;
  reviewedAt?: Timestamp;
  feedback?: string;
}
