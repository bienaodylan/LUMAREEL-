import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const query = req.query || {};
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    success: true,
    message: 'payments function runtime is available',
    method: req.method,
    query,
  });
}
