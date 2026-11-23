import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
  }

  const activeEdition = {
    id: 'ed_founders_2026',
    name: 'LUMARÉEL Black Card',
    editionCode: 'BLACK_2026',
    description:
      'LUMARÉEL Black Card valable 3 ans avec accès prioritaire, parking réservé, premiers rangs VIP, rafraîchissement offert, préventes, Meet & Greet et réductions partenaires.',
    quota: 100,
    allocatedCount: 14,
    isActive: true,
  };

  const plans = [
    {
      id: 'plan_founders_annual',
      editionId: 'ed_founders_2026',
      name: 'LUMARÉEL Black Card 3 Ans',
      description:
        'Accès complet 3 ans : carte noire officielle LUMARÉEL et vos 8 avantages inclus.',
      price: 50000,
      currency: 'FCFA',
      durationMonths: 36,
      isActive: true,
    },
  ];

  return res.status(200).json({
    success: true,
    activeEdition,
    editions: [activeEdition],
    plans,
  });
}
