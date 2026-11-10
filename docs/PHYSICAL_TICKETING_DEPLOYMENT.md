# Déploiement de la billetterie physique LUMARÉEL

## 1. Préparer Supabase

Dans Supabase → SQL Editor, exécuter dans cet ordre :

1. Le schéma principal existant `src/lib/supabase-schema.sql` si le projet ne l'a pas encore reçu.
2. La migration `supabase/migrations/202610310001_physical_ticket_registry.sql`.

La migration ajoute :
- `physical_ticket_batches` : registre des lots physiques ;
- `physical_ticket_serial_counters` : compteur annuel atomique ;
- `physical_ticket_scan_logs` : journal permanent de chaque tentative de scan ;
- `create_physical_ticket_batch` : création transactionnelle du lot et des billets ;
- `verify_and_check_in_ticket` : contrôle transactionnel empêchant deux validations simultanées.

## 2. Variables Vercel

Dans Project → Settings → Environment Variables, ajouter pour Production (et Preview si nécessaire) :

- `SUPABASE_URL` : URL du projet Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` : clé service_role du projet. Elle reste exclusivement côté serveur. Ne jamais la préfixer par `VITE_`, ne jamais la placer dans le code navigateur.

Les variables publiques `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` restent nécessaires au client.

Redéployer après ajout des variables.

## 3. Créer le compte administrateur

1. Activer Email/Password dans Supabase → Authentication → Providers.
2. Créer le compte administrateur depuis la fenêtre de connexion LUMARÉEL et confirmer l'adresse e-mail.
3. Dans SQL Editor, attribuer le rôle après vérification de l'adresse :

```sql
UPDATE public.users
SET role = 'super_admin', email_verified = true
WHERE email = lower('ADMIN@VOTRE-DOMAINE.COM');
```

Remplacer l'adresse par celle du compte administrateur réel. Ne jamais attribuer ce rôle à un compte non maîtrisé.

Les autres membres autorisés à créer des lots ou des liens vigiles peuvent recevoir `box_office` avec `email_verified = true`.

## 4. Vérifications avant ouverture des ventes

- Se connecter avec le compte administrateur et vérifier que la session Supabase est active.
- Créer un lot test de 2 billets et vérifier que les deux numéros de série et jetons sont distincts.
- Vérifier la présence du lot dans `physical_ticket_batches` et des billets dans `tickets`.
- Générer un lien vigile, l'ouvrir dans une fenêtre privée et vérifier l'accès.
- Scanner un billet une première fois : résultat SUCCESS.
- Scanner le même billet une deuxième fois depuis un autre appareil : résultat ALREADY_USED.
- Vérifier les deux entrées dans `physical_ticket_scan_logs`.
- Générer un PDF A3, A4 et A3+ avec les quantités adaptées ; vérifier les dimensions, marges, repères de coupe et ordre des pages.
- Imprimer un exemplaire recto-verso sur l'imprimante cible et vérifier le retournement long/court avant tout tirage en volume.

## 5. Limites à ne pas ignorer

- Le scanner doit être en ligne pour valider un billet via la base centrale. Le mode hors ligne avec synchronisation différée n'est pas inclus dans cette livraison.
- Les anciennes données de lots enregistrées dans `data/print_tickets.json` ne sont pas migrées automatiquement. Les conserver en sauvegarde et prévoir une importation contrôlée si elles doivent être reconnues.
- Le journal cloud conserve les scans, mais l'interface de reporting historique des scans doit encore être reliée à cette table si l'équipe doit le consulter depuis le tableau de bord.
- La CI doit passer et les tests physiques doivent être signés avant fusion en production.
