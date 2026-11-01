/**
 * Point d'entrée de production pour Google Cloud Run / Déploiement conteneurisé.
 * Initialise le runtime TypeScript (ESM) et démarre l'application full-stack server.ts sur PORT 3000.
 */
import 'tsx/esm';
await import('./server.ts');