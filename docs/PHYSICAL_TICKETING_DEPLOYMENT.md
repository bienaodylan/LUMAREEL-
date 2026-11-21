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
12. `202611150001_readonly_physical_nfc_consistency_audit.sql`
13. `202611160001_paginated_physical_nfc_consistency_audit.sql`
14. `202611170001_harden_membership_security_definer_search_path.sql`
15. `202611180001_remove_hardcoded_admin_role_bypass.sql`
16. `202611180002_lock_down_user_profile_role_mutations.sql`

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

## 8. Rapport de cohérence NFC en lecture seule (migration 202611150001)

La migration `202611150001_readonly_physical_nfc_consistency_audit.sql` ajoute
`lumareel_audit_physical_nfc_consistency(p_limit)`. Elle est **strictement en lecture seule**,
réservée au super-admin et limitée à 500 anomalies par appel. Le rapport ne renvoie jamais
les références NFC opaques, UID bruts ou clés.

Anomalies détectées :
- stock physique lié sans credential NFC actif ;
- stock lié sans référence NFC ;
- référence/type de puce du stock différent du credential actif ;
- credential NFC actif sans stock physique opérationnel lié ;
- stock bloqué qui conserve un lien vers une carte membre.

Endpoint admin existant (aucune nouvelle route) :
`GET /api/membership/admin/physical-card-stock?audit=consistency&limit=100`.
La réponse contient les codes d'anomalie, IDs internes, numéro fabricant si applicable et des détails non secrets. L'endpoint exige une session super-admin. Le rapport ne corrige aucune donnée : toute remédiation doit être revue, tracée et exécutée séparément en environnement contrôlé.

Avant utilisation, appliquer les migrations précédentes dans l'ordre sur une base non-production et vérifier le résultat du RPC avec un compte super-admin. Aucune migration n'a été appliquée par ce commit.


## 9. Pagination du rapport de cohérence NFC (migration 202611160001)

La migration `202611160001_paginated_physical_nfc_consistency_audit.sql` ajoute
`lumareel_audit_physical_nfc_consistency_page(p_limit,p_offset)`, sans supprimer ni
modifier le RPC initial `lumareel_audit_physical_nfc_consistency`. Elle renvoie
`total_count`, `limit`, `offset` et la page `anomalies`. Les limites sont strictes :
`limit` entre 1 et 500, `offset` entre 0 et 100000.

Endpoint super-admin existant :
`GET /api/membership/admin/physical-card-stock?audit=consistency&limit=100&offset=0`.

La pagination facilite l'inspection de rapports dépassant 500 anomalies et permet de
savoir combien d'anomalies existent au total, y compris lorsque l'offset est au-delà
de la dernière page. La fonction reste en lecture seule : aucune correction, révocation
ou association n'est exécutée par le rapport. Le RPC historique est conservé pour
compatibilité. Tester les pages 0, suivantes, dernière page et offset hors plage en
environnement non-production avant usage opérationnel.


## 10. Durcissement des RPC SECURITY DEFINER (migration 202611170001)

La migration `202611170001_harden_membership_security_definer_search_path.sql`
réduit le `search_path` des fonctions privilégiées du module Membership/NFC à
`pg_catalog` uniquement :

- `lumareel_current_admin_role()` ;
- association et révocation NFC ;
- association du stock physique ;
- transitions logistiques ;
- remplacement de carte ;
- rapports de cohérence NFC (historique et paginé).

Les tables, helpers et fonctions applicatives appelés par ces RPC sont déjà référencés
avec leur schéma (`public.*` ou `auth.*`). Les fonctions système restent résolues dans
`pg_catalog`. Ce durcissement limite le risque de détournement d'un nom non qualifié
dans le contexte privilégié d'une fonction `SECURITY DEFINER`.

La migration ne change ni les rôles autorisés, ni les contrôles super-admin, ni les
permissions existantes, ni les données. Elle échouera volontairement si une signature
attendue n'existe pas : vérifier d'abord que le schéma de base et les migrations
Membership précédentes sont présents.

Un contrôle SQL non destructif est fourni dans
`supabase/tests/physical_card_security_definer_search_path.sql`. À exécuter après
les migrations sur une base non-production ; il vérifie les propriétés SECURITY DEFINER,
le `search_path` effectif et les droits d'exécution `anon` / `authenticated` des RPC
restreints. Ce test n'a pas été exécuté contre une base PostgreSQL dans cette livraison.


## 11. Attribution explicite des rôles administrateur (migration 202611180001)

La migration `202611180001_remove_hardcoded_admin_role_bypass.sql` supprime
l'attribution de privilèges fondée sur une adresse e-mail codée en dur.

- `lumareel_current_admin_role()` lit exclusivement le rôle de la ligne
  `public.users.id = auth.uid()` ; aucune correspondance d'e-mail n'est utilisée.
- `handle_new_user()` crée les nouveaux profils avec le rôle `customer` et ne
  modifie jamais le rôle lors d'une mise à jour du compte Auth.
- Les deux fonctions SECURITY DEFINER utilisent `search_path = pg_catalog`.
- L'exécution du RPC de rôle est révoquée à `PUBLIC` et `anon`, puis accordée
  à `authenticated`.
- Les schémas de référence `src/lib/supabase-schema.sql` et
  `supabase/full_schema.sql` sont alignés : aucun compte administrateur n'y est
  créé ou promu automatiquement.

**Précontrôle obligatoire :** avant application sur le projet Supabase existant,
vérifier que les comptes administrateurs voulus ont déjà un rôle explicite dans
`public.users`. Un comptage ne révélant aucune identité peut être exécuté ainsi :

```sql
SELECT count(*) AS configured_super_admin_count
FROM public.users
WHERE role = 'super_admin';
```

Si le résultat est nul, arrêter et attribuer explicitement le rôle à un compte
maîtrisé après vérification. La migration ne modifie aucune ligne de profil et ne
rétrograde aucun compte existant. Les nouvelles inscriptions restent clientes par défaut.


## 12. Protection des rôles et profils utilisateurs (migration 202611180002)

L'audit a révélé que les politiques initiales `Public Read Users`,
`Public Insert Users` et `Public Update Users` pouvaient rester actives :
la migration historique de restriction supprimait d'autres noms de politiques.
Elles sont maintenant explicitement supprimées.

La migration `202611180002_lock_down_user_profile_role_mutations.sql` :
- retire les accès de table de `anon` et `authenticated`, puis réaccorde uniquement
  les droits nécessaires à `authenticated` ;
- limite SELECT au propriétaire et aux rôles `super_admin` / `box_office` ; INSERT reste limité au profil dont `id = auth.uid()` ;
- n'autorise l'insertion d'un profil que pour l'identité courante avec le rôle
  `customer` ;
- conserve la modification du seul champ `name` pour le propriétaire ;
- conserve la consultation administrative des profils via `users_admin_select`, sans rétablir de lecture publique ;
- interdit aux clients de modifier `role`, `email`, `email_verified` ou de supprimer
  un profil ;
- ne modifie aucune ligne existante et ne change aucun rôle déjà attribué.

Le test SQL vérifie les privilèges de table/colonne et l'absence de politique RLS
accordée à `PUBLIC`. Exécuter les migrations 202611180001 et 202611180002 dans cet
ordre sur une base non-production, puis vérifier les parcours de lecture et de
modification du nom d'un profil avec un compte utilisateur ordinaire et un compte
administrateur. Aucun test sur la base réelle n'a été exécuté dans cette livraison.


## 13. Masquage des références NFC dans la console (PR #18)

Les références NFC opaques sont masquées par défaut dans les tableaux du stock,
du registre NFC, dans l'aperçu CSV et dans les options d'association de la console
super-administrateur. Les champs de saisie de référence utilisent également un
masquage de type mot de passe par défaut. Un bouton de visibilité permet de les
afficher temporairement dans l'interface ; le masquage est une mesure de réduction
d'exposition à l'écran et non un contrôle d'autorisation.

Les endpoints restent réservés au super-administrateur et doivent continuer à
éviter de retourner des UID bruts, des secrets DESFire ou des clés cryptographiques.
Aucune référence NFC opaque n'est ajoutée aux logs par cette amélioration.


## 14. Isolation des références NFC affichées et pagination d'audit

La visibilité des références NFC opaques est désormais indépendante pour la saisie de réception, le tableau de stock, l'aperçu CSV et le registre NFC. Révéler une référence dans une vue ne la révèle pas dans une autre. Les états de révélation sont réinitialisés lors du changement d'onglet avant le prochain affichage. Les options d'association restent masquées par défaut et n'ont pas de toggle de révélation.

Le panneau de cohérence valide maintenant les champs `total_count`, `limit`, `offset` et la taille de page avant de les afficher. Si les anomalies ont été réduites entre deux requêtes et que l'offset est devenu hors plage, le panneau revient automatiquement à la dernière page valide (ou à la page zéro si le rapport est vide) au lieu de présenter une page vide incohérente.
