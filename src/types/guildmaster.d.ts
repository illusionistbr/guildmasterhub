
import type { Timestamp } from 'firebase/firestore';

export interface Guild {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  bannerUrl?: string;
  logoUrl?: string;
  ownerId: string;
  ownerDisplayName?: string; // Adicionado para nome do dono
  memberIds?: string[];
  game?: string;
  tags?: string[];
  createdAt?: Date | Timestamp; // Can be Firestore Timestamp on read, Date after conversion, or FieldValue on write
  password?: string;
  isOpen?: boolean;
  socialLinks?: {
    facebook?: string;
    x?: string;
    youtube?: string;
    discord?: string;
  };
  roles?: { [userId: string]: string }; // e.g., { "userId1": "Líder", "userId2": "Oficial" }
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
  // Add any other user-specific fields you need
  guilds?: string[]; // List of guild IDs the user is part of
}
