# LUMARÉEL — Cahier des charges UX/UI et fonctionnel

> Document de référence pour la refonte. Les fonctionnalités métier existantes doivent être conservées ; la simplification concerne d'abord leur organisation, leurs parcours et leur présentation.

## Objectif

Transformer LUMARÉEL en une plateforme de concerts et de billetterie premium, simple à comprendre et rapide à utiliser, avec une expérience mobile prioritaire et une interface desktop cohérente. Réduire la charge cognitive, les doublons de navigation et les écrans inutilement complexes, sans retirer de capacités.

## Principes UX/UI

- Une navigation principale courte et stable ; les fonctionnalités secondaires sont regroupées dans un espace Explorer/Club clairement organisé.
- Les actions prioritaires (découvrir un concert, acheter un billet, retrouver ses billets, accéder à sa Black Card) doivent être immédiatement visibles.
- Une page = un objectif principal ; limiter les panneaux, modales, cartes empilées et textes superflus.
- Hiérarchie typographique et visuelle nette, composants cohérents, zones tactiles confortables, états vides/chargement/erreur explicites.
- Responsive réel : mobile, tablette et desktop ; respecter les safe areas et éviter les débordements horizontaux.
- Animations courtes et utiles, jamais au détriment de la vitesse ou de l'accessibilité.
- Conserver l'identité premium sombre/noir et or de LUMARÉEL, avec un usage mesuré de l'accent doré.

## Architecture de navigation cible — proposition de travail

Navigation principale :
1. Accueil — événements à venir et découverte éditoriale.
2. Billets — billets achetés, commandes et historique.
3. Explorer — accès organisé aux contenus et services communautaires.
4. Black Card — statut, avantages et gestion de la carte.
5. Compte — profil, préférences et paramètres.

Dans Explorer :
- Récompenses & points
- Parrainage
- Backstage
- Flash Drops
- Souvenirs de concerts
- Boîte à suggestions
- Archives
- Actualités

Cette organisation est une cible UX à valider lors de la revue des écrans existants ; les destinations et leurs capacités ne doivent pas disparaître.

## Fidélité — barème validé

| Action | Points |
|---|---:|
| Téléchargement et création de compte | 50 |
| Profil complété | 50 |
| Achat billet Standard | 100 |
| Achat billet VIP | 250 |
| Présence au concert confirmée par scan QR | 150 |
| Parrainage après premier achat confirmé du filleul | 200 |
| Souscription Black Card | 250 |

Règles d'attribution :
- Une attribution unique par événement métier éligible (idempotence).
- L'achat doit être réellement confirmé côté serveur ; ne jamais attribuer sur la seule base d'un retour navigateur.
- La présence est validée par le scan du billet et un billet ne peut être validé qu'une seule fois.
- Prévoir les corrections/annulations en cas de remboursement, annulation de commande ou fraude.
- Conserver un journal de mouvements consultable par l'utilisateur et l'administration.
- Les montants de points doivent être configurables par l'administration sans déploiement de code.

## Parrainage — crédit billetterie validé

- Chaque membre possède un code de parrainage personnel.
- Le filleul doit s'inscrire avec ce code puis effectuer son premier achat confirmé.
- Après confirmation de cet achat, le parrain reçoit 500 FCFA de crédit billetterie et le filleul reçoit 500 FCFA de crédit billetterie.
- Le crédit est réservé à l'achat de billets LUMARÉEL ; il n'est ni retirable ni transférable en espèces.
- Afficher code, partage, invitations, filleuls en attente, achats confirmés, crédits reçus et historique.
- Protéger le système contre auto-parrainage, comptes multiples et attribution répétée.

**À distinguer :** les 200 points de parrainage et les 500 FCFA de crédit billetterie sont deux récompenses séparées. Le déclencheur commun est le premier achat confirmé du filleul. Éviter tout double comptage des points d'achat du billet : le moteur de récompenses doit appliquer une règle unique par événement.

## Récompenses

- Solde de points et progression.
- Actions permettant de gagner des points.
- Catalogue : billets gratuits, expériences Backstage, invitations privées, réductions partenaires.
- Coût, disponibilité, conditions et historique de chaque échange.
- Confirmation claire avant dépense des points.

## Backstage

Espace de contenus exclusifs (coulisses, soundchecks, interviews, contenus privés). Il est distinct des Archives et peut appliquer des règles d'accès selon le statut du membre.

## Flash Drops

Espace d'offres surprises et ventes flash avec quantité, durée, conditions, statut et disponibilité clairement affichés.

## Souvenirs de concerts

Une page par événement passé : photos officielles, meilleurs moments, vidéos récapitulatives, téléchargement et partage selon les droits configurés.

## Boîte à suggestions

Permettre de proposer artistes, lieux et concepts d'événements. Prévoir accusé de réception, statut de traitement, modération et gestion depuis l'administration.

## Black Card — avantage SOLD OUT

Les membres Black Card disposent d'un quota de billets réservé pour chaque événement. Cette réserve est séparée du stock public :
- Le statut SOLD OUT public ne bloque pas l'achat depuis la réserve Black Card tant que le quota réservé contient des billets.
- Quand la réserve dédiée est épuisée, afficher clairement l'indisponibilité.
- Afficher les conditions d'éligibilité et le nombre de billets restants si la politique commerciale le permet.
- Les réserves doivent être gérées côté serveur et protégées contre les ventes concurrentes et le dépassement de stock.

## Administration

L'administration doit rester simple et orientée tâches : événements, commandes/billets, scan et contrôle d'accès, membres/Black Card, contenus, récompenses, parrainage, Flash Drops, suggestions et paramètres. Les actions sensibles doivent être journalisées et les droits contrôlés côté serveur.

## Fonctionnalités critiques à préserver pendant la refonte

- Authentification et validation du compte.
- Paiements et confirmation serveur (PayMeTrust et moyens réellement configurés).
- Création des commandes et génération des billets/QR.
- Scan QR et prévention des doubles validations.
- Gestion des événements, archives et contenus via Supabase.
- Black Card et son parcours de souscription/activation.
- Accès d'administration et de scanner.

## Plan d'exécution

1. Auditer les écrans et les 19 derniers commits ; cartographier ce qui existe réellement et identifier les doublons/régressions.
2. Définir les parcours et la navigation cible sans supprimer de fonctionnalités.
3. Refonte du shell de navigation et des composants transversaux.
4. Refonte écran par écran, en commençant par Accueil, Billets, Explorer, Black Card et Compte.
5. Intégrer les règles métier points/parrainage/stock Black Card au backend et à l'interface ; ne pas se limiter à des compteurs visuels.
6. Vérifier build, lint, responsive, authentification, paiements, tickets, scan et administration avant fusion/déploiement.

## Contraintes de sécurité de livraison

- Travailler sur une branche dédiée, jamais directement sur main pendant la refonte.
- Ne pas toucher aux secrets ni aux paramètres de production.
- Ne pas remplacer les mécanismes de paiement, d'authentification ou de scan sans audit et tests ciblés.
- Chaque lot doit être relu et vérifié avant fusion.
