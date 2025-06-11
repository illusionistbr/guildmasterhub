import type { Guild, Event, Achievement, Application } from '@/types/guildmaster';

export const mockGuilds: Guild[] = [
  {
    id: 'guild-1-owner',
    name: 'Os Desbravadores Épicos',
    description: 'Uma guilda lendária em busca de aventuras e glória.',
    memberCount: 150,
    bannerUrl: 'https://placehold.co/1200x300.png?text=Banner+Desbravadores',
    logoUrl: 'https://placehold.co/150x150.png?text=DE',
    ownerId: 'user-owner-123', // Mock owner ID
    memberIds: ['user-member-456', 'user-member-789', 'user-owner-123'],
    game: 'World of Fantasy',
    tags: ['PvE', 'Exploração', 'Amigável'],
    createdAt: new Date('2022-01-15T10:00:00Z'),
  },
  {
    id: 'guild-2-member',
    name: 'Legião Sombria',
    description: 'Dominamos os reinos com astúcia e poder.',
    memberCount: 75,
    bannerUrl: 'https://placehold.co/1200x300.png?text=Banner+Legião',
    logoUrl: 'https://placehold.co/150x150.png?text=LS',
    ownerId: 'user-other-owner-abc',
    memberIds: ['user-member-xyz', 'user-owner-123'], // Current mock user is a member here
    game: 'Shadow Realms RPG',
    tags: ['PvP', 'Competitivo', 'Hardcore'],
    createdAt: new Date('2023-05-20T14:30:00Z'),
  },
];

export const mockEvents: Event[] = [
  {
    id: 'event-1',
    guildId: 'guild-1-owner',
    title: 'Caçada ao Dragão Ancestral',
    description: 'Preparem-se para enfrentar o temível Dragão Vermelho em seu covil!',
    date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(),
    time: '20:00',
    location: 'Montanhas Calcinadas',
    organizerId: 'user-owner-123',
  },
  {
    id: 'event-2',
    guildId: 'guild-1-owner',
    title: 'Torneio Interno de Duelos',
    description: 'Mostre suas habilidades e compita pelo título de campeão da guilda.',
    date: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString(),
    time: '18:00',
    location: 'Arena da Guilda',
    organizerId: 'user-member-456',
  },
  {
    id: 'event-3',
    guildId: 'guild-2-member',
    title: 'Exploração das Ruínas Perdidas',
    description: 'Descubra segredos antigos e tesouros escondidos nas profundezas das ruínas.',
    date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    time: '19:30',
    organizerId: 'user-other-owner-abc',
  },
];

export const mockAchievements: Achievement[] = [
  {
    id: 'ach-1',
    guildId: 'guild-1-owner',
    title: 'Primeira Queda do Lich Rei',
    description: 'A guilda derrotou o Lich Rei pela primeira vez, um feito memorável.',
    dateAchieved: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
    category: 'Raid Boss',
  },
  {
    id: 'ach-2',
    guildId: 'guild-1-owner',
    title: 'Mestre Artesão da Guilda',
    description: 'Alcançamos o nível máximo em todas as profissões de criação da guilda.',
    dateAchieved: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
    category: 'Crafting',
  },
  {
    id: 'ach-3',
    guildId: 'guild-2-member',
    title: 'Conquistadores da Arena Sangrenta',
    description: 'Dominamos a Arena Sangrenta por uma temporada inteira.',
    dateAchieved: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(),
    category: 'PvP',
  },
];

export const mockApplications: Application[] = [
  {
    id: 'app-1',
    guildId: 'guild-1-owner',
    applicantId: 'user-applicant-001',
    applicantName: 'Aventureiro Novato',
    answers: { 'Por que quer se juntar?': 'Busco uma comunidade ativa e amigável.', 'Qual sua classe?': 'Guerreiro' },
    status: 'pending',
    submittedAt: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
  },
  {
    id: 'app-2',
    guildId: 'guild-1-owner',
    applicantId: 'user-applicant-002',
    applicantName: 'Maga Experiente',
    answers: { 'Por que quer se juntar?': 'Quero participar de raids desafiadoras.', 'Qual sua classe?': 'Mago' },
    status: 'approved',
    submittedAt: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(),
    reviewedBy: 'user-owner-123',
    reviewedAt: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString(),
  },
];
