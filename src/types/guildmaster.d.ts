
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
  createdAt?: Timestamp; // Added for user profile storage
}

export interface GuildMember extends UserProfile {
  role: GuildRole;
}
