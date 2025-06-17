
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
}

export enum TLRole {
  Tank = "Tank",
  Healer = "Healer",
  DPS = "DPS",
}

export enum TLWeapon {
  SwordAndShield = "Espada e Escudo",
  Greatsword = "Montante",
  Daggers = "Adagas",
  Crossbow = "Besta",
  Bow = "Arco Longo",
  Staff = "Cajado",
  WandAndTome = "Varinha e Tomo",
  Spear = "Lanca",
}

export type MemberStatus = 'Ativo' | 'Inativo' | 'Licenca';

export interface GuildMemberRoleInfo {
  roleName: string;
  characterNickname?: string; // Nick do personagem específico para esta guilda
  gearScore?: number;         // Gearscore específico para esta guilda
  gearScoreScreenshotUrl?: string; // Link da print do gearscore
  gearBuildLink?: string; // Link para a build de equipamento
  skillBuildLink?: string; // Link para a build de habilidades
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
  applicantName: string; // Este deve ser o characterNickname da aplicação
  applicantDisplayName: string; // Este é o UserProfile.displayName
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
  customAnswers?: { [questionId: string]: string };
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null; // Nickname global do usuário
  photoURL?: string | null;
  guilds?: string[];
  createdAt?: Timestamp;
  lastNotificationsCheckedTimestamp?: {
    [guildId: string]: Timestamp;
  };
  // gearScore global pode ser removido se sempre usarmos o específico da guilda
}

export interface GuildMember extends UserProfile {
  // roleName, tlRole, etc., virão de Guild.roles[userId]
  // Esta interface representa o perfil base do usuário enriquecido com informações da guilda
  // para exibição e contexto.
  roleName: string; // Mantido para conveniência, mas a fonte é Guild.roles
  characterNickname?: string; // Nick do personagem na guilda
  gearScore?: number; // Gearscore na guilda
  gearScoreScreenshotUrl?: string;
  gearBuildLink?: string;
  skillBuildLink?: string;
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
  displayName: string; // Deve ser o characterNickname se disponível
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
}

export interface AuditLogDetails {
  targetUserId?: string;
  targetUserDisplayName?: string; // Usar characterNickname se for atualização de perfil de membro
  oldValue?: string | boolean | TLRole | TLWeapon | MemberStatus | GuildPermission[] | number;
  newValue?: string | boolean | TLRole | TLWeapon | MemberStatus | GuildPermission[] | number;
  fieldName?: string;
  kickedUserRoleName?: string;
  eventName?: string;
  eventId?: string;
  achievementName?: string;
  achievementId?: string;
  changedField?: 'name' | 'password' | 'description' | 'visibility' | 'game' | 'socialLinks' | 'notes' | 'tlRole' | 'tlPrimaryWeapon' | 'tlSecondaryWeapon' | 'status' | 'roleName' | 'customRoles' | 'recruitmentQuestions' | 'characterNickname' | 'gearScore' | 'gearScoreScreenshotUrl' | 'gearBuildLink' | 'skillBuildLink';
  noteSummary?: string;
  applicationId?: string;
  dkpValueAwarded?: number;
  groupId?: string;
  groupName?: string;
  roleName?: string;
  permissions?: GuildPermission[];
  details?: {
    joinMethod?: 'direct_public_non_tl' | 'public_form_join' | 'application_approved';
    questionnaireChangeSummary?: string;
    updatedFields?: string[]; // Para MEMBER_GUILD_PROFILE_UPDATED
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

