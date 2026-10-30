export type Role = 'super_admin' | 'box_office' | 'gate_agent' | 'customer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  price: number;
  currency: 'XOF' | 'EUR';
  quota: number;
  sold: number;
  description: string;
  perks: string[];
}

export interface ConcertEvent {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  artist: string;
  date: string; // ISO date 'YYYY-MM-DD'
  time: string; // '20:30'
  doorsOpen: string; // '19:30'
  venue: string;
  city: string;
  country: string;
  address: string;
  description: string;
  artistPortrait: string; // Portrait visual
  officialPoster: string; // Official poster (3:4)
  bannerImage: string; // Cinematic panoramic banner (16:9)
  coverImage?: string;
  status: 'published' | 'draft' | 'sold_out' | 'cancelled' | 'completed';
  isFeatured: boolean;
  organizerType: 'lumareel' | 'partner';
  organizerName: string;
  organizerId?: string;
  genre: string; // 'Rap / Hip-Hop' | 'Électro & Expérimental' | 'Afrobeats / Live' | etc.
  platformFeePercent?: number; // Configurable commission
  infoline?: string; // Contact phone for ticketing
  categories: TicketCategory[];
}

export interface ExternalOrganizer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  status: 'pending' | 'approved' | 'rejected';
  eventsCount: number;
  commissionRate: number;
  createdAt: string;
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  summary: string;
  content: string;
  imageUrl: string;
  readTime: string;
  author: string;
}

export interface Order {
  id: string;
  reference: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: 'XOF' | 'EUR';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentProvider: 'geniuspay';
  paymentRef: string;
  createdAt: string;
  paidAt?: string;
  tickets?: Ticket[];
}

export interface Ticket {
  id: string;
  orderId: string;
  orderRef: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  categoryId: string;
  categoryName: string;
  serialNumber: string; // e.g. LMR-2026-NOC-4821
  token: string; // Cryptographic validation token embedded in QR
  holderName: string;
  holderEmail: string;
  status: 'valid' | 'used' | 'cancelled';
  issuedAt: string;
  checkedInAt?: string;
  checkedInBy?: string;
}

export interface ScanVerificationResult {
  status: 'VALID' | 'ALREADY_USED' | 'WRONG_EVENT' | 'INVALID_OR_NOT_FOUND' | 'CANCELLED';
  message: string;
  ticket?: Ticket;
  previousCheckIn?: {
    checkedInAt: string;
    checkedInBy: string;
  };
}

export interface ArchiveProduction {
  id: string;
  title: string;
  year: string;
  date?: string; // e.g. "19 Décembre 2026"
  city: string;
  country: string;
  venue: string;
  artists: string[];
  coverImage: string; // 16:9 thumbnail
  description: string;
  youtubeUrl?: string; // YouTube video link (e.g. watch?v=... or youtu.be/...)
  youtubeEmbedUrl?: string; // Converted embed URL
  duration?: string; // e.g. "18:42" or "Recap HD"
  photos: string[]; // Photo gallery
  isPublished: boolean;
  orderIndex: number;
}

export interface WorkProduction {
  id: string;
  title: string;
  client: string;
  year: string;
  scope: string;
  description: string;
  imageUrl: string;
}

export interface TransactionalEmail {
  id: string;
  recipient: string;
  subject: string;
  type: 'ticket_confirmation' | 'account_verification' | 'payment_notice';
  orderRef?: string;
  status: 'sent' | 'queued' | 'failed';
  timestamp: string;
  contentPreview: string;
}

export interface AdminStats {
  publishedEvents: number;
  ticketsSold: number;
  totalQuota: number;
  confirmedRevenueXof: number;
  pendingOrdersCount: number;
  paidOrdersCount: number;
  checkedInTickets: number;
}

export interface ScannerToken {
  id: string;
  token: string;
  eventId: string;
  eventTitle: string;
  artistName: string;
  createdAt: string;
  expiresAt: string;
  createdBy?: string;
  revoked?: boolean;
}

export interface PlatformSettings {
  platformName: string;
  tagline: string;
  logoUrl?: string;
  logoMonogram: string;
  currency: string;
  infoline: string;
  gateToken: string;
  githubRepoUrl?: string;
}

