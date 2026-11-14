import { z } from 'zod';
import type { Response } from 'express';

export const loginSchema = z
  .object({
    email: z.string().trim().email('Identifiants invalides.').max(200),
    password: z.string().min(1, 'Identifiants invalides.').max(200),
    totpCode: z.string().trim().regex(/^\d{6}$/, 'Code 2FA à 6 chiffres invalide.').optional(),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email('Adresse e-mail invalide.').max(200),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(16, 'Jeton de réinitialisation invalide.').max(256),
    newPassword: z
      .string()
      .min(10, 'Le nouveau mot de passe doit comporter au moins 10 caractères.')
      .max(200),
  })
  .strict();

export const totpVerifySchema = z
  .object({
    code: z.string().trim().regex(/^\d{6}$/, 'Code TOTP à 6 chiffres requis.'),
  })
  .strict();

export const totpDisableSchema = z
  .object({
    password: z.string().min(1, 'Mot de passe requis.').max(200),
    code: z.string().trim().regex(/^\d{6}$/, 'Code TOTP à 6 chiffres requis.'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(10, 'Le nouveau mot de passe doit comporter au moins 10 caractères.').max(200),
  })
  .strict();

export const deleteAccountSchema = z
  .object({
    password: z.string().min(1, 'Mot de passe requis.').max(200),
    email: z.string().optional(),
  })
  .strict();

export const contactSchema = z
  .object({
    name: z.string().trim().min(1, 'Nom requis.').max(120),
    email: z.string().trim().email('Adresse e-mail invalide.').max(200),
    subject: z.string().trim().max(200).optional(),
    organization: z.string().trim().max(150).optional(),
    message: z.string().trim().min(2, 'Message requis.').max(4000),
    website: z.string().max(200).optional(), // honeypot
  })
  .strict();

export const organizerRegisterSchema = z
  .object({
    companyName: z.string().trim().min(1).max(160),
    contactName: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(40).default(''),
    city: z.string().trim().max(100).default(''),
    country: z.string().trim().max(100).default(''),
    experienceYears: z.string().trim().max(80).optional(),
    pastEvents: z.string().trim().max(1000).optional(),
  })
  .strict();

export const ticketDesignSchema = z
  .object({
    ticketImageUrl: z.string().trim().min(1).max(120000).optional(),
    imageUrl: z.string().trim().min(1).max(120000).optional(),
  })
  .strict()
  .refine((d) => Boolean(d.ticketImageUrl || d.imageUrl), {
    message: 'URL ou image du design de billet requise.',
  });

export const settingsUpdateSchema = z
  .object({
    platformName: z.string().trim().min(1).max(80).optional(),
    tagline: z.string().trim().max(160).optional(),
    logoMonogram: z.string().trim().max(16).optional(),
    logoUrl: z.string().trim().max(2000).optional(),
    currency: z.enum(['FCFA', 'XOF', 'EUR']).optional(),
    infoline: z.string().trim().max(60).optional(),
    gateToken: z.string().trim().max(200).optional(),
    githubRepoUrl: z.string().trim().max(500).optional(),
  })
  .strict();

export const archiveSchema = z
  .object({
    id: z.string().trim().max(80).optional(),
    title: z.string().trim().min(1, 'Titre requis.').max(200),
    year: z.string().trim().max(10).optional(),
    date: z.string().trim().max(60).optional(),
    city: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    venue: z.string().trim().max(200).optional(),
    artists: z.array(z.string().trim().max(120)).max(20).optional(),
    coverImage: z.string().trim().max(5000).optional(),
    description: z.string().trim().max(4000).optional(),
    youtubeUrl: z.string().trim().max(500).optional(),
    youtubeEmbedUrl: z.string().trim().max(500).optional(),
    duration: z.string().trim().max(40).optional(),
    photos: z.array(z.string().trim().max(2000)).max(40).optional(),
    isPublished: z.boolean().optional(),
    orderIndex: z.number().int().min(0).max(10000).optional(),
  })
  .strict();

export const printBatchSchema = z
  .object({
    requestId: z.string().trim().max(120).optional(),
    eventId: z.string().trim().min(1).max(100),
    eventTitle: z.string().trim().max(200).optional(),
    artist: z.string().trim().max(200).optional(),
    eventDate: z.string().trim().max(40).optional(),
    eventTime: z.string().trim().max(20).optional(),
    eventVenue: z.string().trim().max(200).optional(),
    categoryId: z.string().trim().min(1).max(100),
    categoryName: z.string().trim().max(120).optional(),
    quantity: z.coerce.number().int().min(1).max(10000),
  })
  .strict();

export const scannerTokenCreateSchema = z
  .object({
    createdBy: z.string().trim().max(120).optional(),
    eventTitle: z.string().trim().max(200).optional(),
    artistName: z.string().trim().max(200).optional(),
    durationHours: z.coerce.number().int().min(1).max(24).optional(),
  })
  .strict();

export const scannerSessionCreateSchema = z
  .object({
    token: z.string().trim().min(4).max(256).optional(),
    eventId: z.string().trim().max(100).optional(),
  })
  .strict();

export const verifyTicketSchema = z
  .object({
    ticketId: z.string().trim().max(200).optional(),
    token: z.string().trim().max(200).optional(),
    id: z.string().trim().max(200).optional(),
    qrData: z.string().trim().max(200).optional(),
    scannerToken: z.string().trim().max(256).optional(),
    eventId: z.string().trim().max(100).optional(),
    targetEventId: z.string().trim().max(100).optional(),
    gateAgentId: z.string().trim().max(120).optional(),
  })
  .strict();

export const membershipOrderSchema = z
  .object({
    customerName: z.string().trim().min(1).max(120),
    customerEmail: z.string().trim().email().max(200),
    customerPhone: z.string().trim().max(40).optional(),
    paymentMethod: z.string().trim().max(60).optional(),
    planId: z.string().trim().max(100).optional(),
    shippingAddress: z
      .object({
        street: z.string().trim().max(200).optional(),
        city: z.string().trim().max(100).optional(),
        country: z.string().trim().max(100).optional(),
        recipientName: z.string().trim().max(120).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const membershipPlanUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    price: z.coerce.number().int().min(1000).max(50000000).optional(),
    currency: z.string().trim().max(10).optional(),
    description: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const redeemBenefitSchema = z
  .object({
    cardId: z.string().trim().max(100).optional(),
    benefitId: z.string().trim().min(1).max(100),
    eventId: z.string().trim().max(100).optional(),
    quantity: z.coerce.number().int().min(1).max(10).optional(),
  })
  .strict();

export const checkAccessSchema = z
  .object({
    cardIdentifier: z.string().trim().max(256).optional(),
    identifier: z.string().trim().max(256).optional(),
    eventId: z.string().trim().max(100).optional(),
    accessPointType: z
      .enum(['main_entrance', 'priority_lane', 'member_desk', 'vip_lounge', 'backstage_artists', 'invitations_booth'])
      .optional(),
    operatorId: z.string().trim().max(120).optional(),
    scannerToken: z.string().trim().max(256).optional(),
    scanMethod: z.enum(['qr_code', 'manual_override']).optional(),
    hasConcertTicket: z.boolean().optional(),
    ticketId: z.string().trim().max(120).optional(),
  })
  .strict();

export const cardStatusSchema = z
  .object({
    status: z.enum(['active', 'suspended', 'revoked']),
    reason: z.string().trim().max(300).optional(),
  })
  .strict();

export const physicalStatusSchema = z
  .object({
    physicalStatus: z.enum([
      'requested',
      'payment_pending',
      'approved',
      'in_production',
      'printed',
      'quality_checked',
      'ready_for_dispatch',
      'shipped',
      'delivered',
      'cancelled',
      'blocked',
      'lost',
      'returned',
      'replacement_requested',
      'defective',
    ]),
    trackingNumber: z.string().trim().max(120).optional(),
  })
  .strict();

export const rotateTokenSchema = z
  .object({
    reason: z.string().trim().max(300).optional(),
    actorId: z.string().trim().max(100).optional(),
  })
  .strict();

export const encodeChipSchema = z
  .object({
    chipUid: z.string().trim().min(4).max(64),
    chipType: z.string().trim().max(64).optional(),
    terminal: z.string().trim().max(120).optional(),
  })
  .strict();

export const walletRechargeSchema = z
  .object({
    amount: z.coerce.number().int().min(100).max(50000000),
    paymentMethod: z.string().trim().max(80).optional(),
    location: z.string().trim().max(120).optional(),
    idempotencyKey: z.string().trim().max(128).optional(),
  })
  .strict();

export const posChargeSchema = z
  .object({
    chipUid: z.string().trim().max(64).optional(),
    cardId: z.string().trim().max(100).optional(),
    amount: z.coerce.number().int().min(1).max(20000000),
    location: z.string().trim().max(120).optional(),
    terminalId: z.string().trim().max(80).optional(),
    idempotencyKey: z.string().trim().max(128).optional(),
  })
  .strict();

export const chipInventorySchema = z
  .object({
    chipUid: z.string().trim().min(4).max(64),
    batchNumber: z.string().trim().max(80).optional(),
    chipType: z.string().trim().max(64).optional(),
    notes: z.string().trim().max(300).optional(),
  })
  .strict();

export const chipBatchImportSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            chipUid: z.string().trim().min(4).max(64),
            batchNumber: z.string().trim().max(80).optional(),
            chipType: z.string().trim().max(64).optional(),
          })
          .strict()
      )
      .min(1)
      .max(500),
  })
  .strict();

export const revokeChipSchema = z
  .object({
    reason: z.enum(['lost', 'stolen', 'damaged', 'membership_cancelled']),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const replaceChipSchema = z
  .object({
    newChipUid: z.string().trim().min(4).max(64),
    reason: z.string().trim().max(200).optional(),
  })
  .strict();

export const invitationRespondSchema = z
  .object({
    response: z.enum(['accepted', 'declined']),
  })
  .strict();

export const invitationCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    subtitle: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    category: z.enum(['exclusive_gala', 'artist_meet', 'secret_show', 'vip_reception', 'acoustic_session']).optional(),
    host: z.string().trim().max(120).optional(),
    eventDate: z.string().trim().min(1).max(40),
    eventTime: z.string().trim().max(20).optional(),
    venue: z.string().trim().min(1).max(200),
    city: z.string().trim().max(100).optional(),
    recipientEmail: z.string().trim().email().max(200).optional(),
    recipientName: z.string().trim().max(120).optional(),
    membershipRequired: z.boolean().optional(),
    editionCode: z.string().trim().max(60).optional(),
    dressCode: z.string().trim().max(120).optional(),
    plusOnesAllowed: z.coerce.number().int().min(0).max(5).optional(),
    expiresAt: z.string().trim().max(60).optional(),
  })
  .strict();

export const accessScanSchema = z
  .object({
    rawToken: z.string().trim().min(1).max(256),
    eventId: z.string().trim().max(100).optional(),
    zone: z.string().trim().max(80).optional(),
    operatorId: z.string().trim().max(120).optional(),
    scannerToken: z.string().trim().max(256).optional(),
  })
  .strict();

export function parseWithSchema<T>(schema: z.ZodType<T>, body: unknown, res: Response): T | null {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Données de requête invalides.',
    });
    return null;
  }
  return parsed.data;
}
