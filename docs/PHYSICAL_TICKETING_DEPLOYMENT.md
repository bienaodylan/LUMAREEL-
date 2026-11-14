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


## 6. LUMARÉEL CARD physique & NFC (migrations séparées)

Pour le module d'adhésion / cartes membres, appliquer les migrations versionnées
ci-dessous **dans l'ordre chronologique**, sur le projet Supabase déjà utilisé :

1. `202611100001_lumareel_card_system.sql`
2. `202611100002_lumareel_qr_printing_workshop.sql`
3. `202611100003_restore_secure_nfc_registry.sql`
4. `202611100004_secure_nfc_enrollment_rpcs.sql`
5. `202611100005_fix_nfc_diversification_seed.sql`
6. `202611100006_restrict_card_workshop_rls.sql`
7. `202611100007_lock_down_membership_audit.sql`
8. `202611100008_physical_card_received_stock.sql`
9. `202611110001_secure_physical_card_stock_lifecycle.sql`
10. `202611130001_secure_physical_card_replacement.sql`
11. `202611140001_guard_physical_nfc_replacement_consistency.sql`

**Attention :** la migration 0002 supprime la table NFC historique avec `CASCADE` ;
la migration 0003 la recrée ensuite en registre de métadonnées. Ne pas sauter
0003–0007. La migration 0009 convertit les RPC NFC/association en fonctions
`SECURITY DEFINER` strictement autorisées au super-admin (pour que leurs écritures d'audit
fonctionnent malgré le verrouillage de `membership_events`) et impose les transitions
logistiques par RPC transactionnelle : carte membre active/payée requise avant
`ready`, `shipped` ou `delivered`, journalisation dans la même transaction, et pas de
mise à jour directe du statut par le client authentifié.

L'API de réception rejette désormais les champs trop longs (sans troncature silencieuse),
les types de puces inconnus, les références NFC mal formées et les identifiants non UUID.
Un JSON mal formé est une erreur 400 ; un doublon de stock est une erreur 409 et
l'import multi-lignes reste atomique (une contrainte échouée annule tout l'insert).

Après application, tester dans un environnement non-production : réception → vérification
→ association à une adhésion payée → prêt → expédition → livraison ; vérifier aussi
les transitions interdites, l'accès non-super-admin, la révocation NFC et la présence
exacte des événements d'audit. Aucune migration n'est appliquée automatiquement par le
repository ou cette documentation.

## 6. Remplacement sécurisé d'une carte physique (migration 202611130001)

La migration `202611130001_secure_physical_card_replacement.sql` ajoute le RPC `lumareel_replace_physical_card`. Elle doit être appliquée après les migrations NFC et de stock (0003–0009).

Le remplacement est une transaction unique :

1. verrouille les deux lignes de stock dans un ordre déterministe, puis la carte membre ;
2. exige un super-administrateur, une adhésion active/payée, une ancienne carte liée et un nouveau stock disponible/vérifié avec puce EV2/EV3 ;
3. révoque le credential NFC actif avec un motif, puis associe la nouvelle référence NFC ;
4. bloque l'ancien stock (il peut être perdu, donc il n'est pas marqué « returned »), libère son lien, associe le nouveau stock et remet le suivi physique à « in_production » ;
5. écrit les événements NFC et `PHYSICAL_CARD_REPLACED` dans la même transaction. Une erreur annule toutes les étapes.

API admin : `POST /api/membership/admin/physical-card-stock` avec `action: "replace"`, `membershipCardId`, `oldStockId`, `newStockId` et `reason` (5–500 caractères). Le endpoint exige `super_admin`; ne transmettre aucune clé NFC ni UID brut.

À tester en non-production : remplacement réussi, ancien credential inutilisable, ancien stock bloqué/délié, nouveau stock assigné, motif d'audit présent, et rollback complet si le nouveau stock ou le credential est invalide. Cette migration n'a pas été appliquée à Supabase dans cette livraison.


## 7. Contrôle de cohérence NFC au remplacement (migration 202611140001)

La migration `202611140001_guard_physical_nfc_replacement_consistency.sql` remplace le RPC de remplacement par une version renforcée :

- verrouille tous les credentials actifs de la carte et exige **exactement un** credential actif (les données historiques ambiguës sont refusées) ;
- vérifie que la référence NFC opaque et le type de puce de l'ancien stock correspondent exactement au credential à révoquer ;
- refuse le remplacement en cas de divergence, avant toute révocation ou modification du stock ;
- conserve le même contrat API et le rollback transactionnel.

Cette garde évite de révoquer une puce tout en bloquant par erreur une autre carte physique. Elle ne répare pas automatiquement les éventuelles incohérences existantes : celles-ci doivent être examinées et corrigées manuellement en environnement contrôlé, avec audit.
