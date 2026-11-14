import pino from 'pino';

const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
const level = process.env.LOG_LEVEL || (isTest ? 'silent' : process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = pino({
  name: 'lumareel-co',
  level,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.currentPassword',
      '*.newPassword',
      '*.token',
      '*.tokenHash',
      '*.secret',
      '*.totpSecret',
      '*.orderAccessToken',
      '*.scannerToken',
    ],
    censor: '[REDACTED]',
  },
});
