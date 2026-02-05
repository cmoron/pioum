# PRD - Pioum : Covoiturage Muscu

## Vision

Une webapp simple et fun pour organiser les covoiturages quotidiens d'un groupe d'amis allant à la salle de sport ensemble.

---

## Contexte & Problème

### Situation actuelle
- Groupe de 2 à 8 amis allant à la muscu le midi
- Organisation quotidienne via WhatsApp
- Questions répétitives chaque matin :
  - Qui vient aujourd'hui ?
  - Qui a sa voiture ?
  - Combien de places ?
  - Qui monte avec qui ?

### Problèmes identifiés
1. **Friction quotidienne** : Mêmes questions posées chaque jour
2. **Manque de visibilité** : Difficile de voir rapidement l'état des covoiturages
3. **Pas d'historique** : Aucune trace des trajets passés
4. **Gestion des "bans"** : Les blagues de bannissement ne sont pas tracées

---

## Utilisateurs cibles

### Persona unique : Le Pote Muscu
- **Qui** : Membre d'un groupe d'amis (pas de limite de taille)
- **Besoin** : Savoir rapidement si je peux aller à la muscu et avec qui
- **Comportement** : Check l'app le matin, confirme sa participation en 2 clics

---

## Fonctionnalités

### MVP - Version 1.0

#### F1 : Gestion du groupe
- **F1.1** : Créer un groupe avec un nom
- **F1.2** : Inviter des membres via un lien/code
- **F1.3** : Liste des membres du groupe
- **F1.4** : Profil avec nom et avatar personnalisé

#### F1.5 : Système d'avatars
- **F1.5a** : Banque d'avatars prédéfinis (customs du groupe)
- **F1.5b** : Upload d'avatar personnel (optionnel)
- **F1.5c** : Avatars affichés partout (liste membres, voitures, bans)

#### F2 : Session quotidienne
- **F2.1** : Créer une session pour une date (par défaut : aujourd'hui)
- **F2.2** : Indiquer sa participation (Je viens / Je ne viens pas)
- **F2.3** : Vue en temps réel des participants

#### F3 : Gestion des voitures
- **F3.1** : Déclarer "J'ai ma voiture" avec nombre de places disponibles
- **F3.2** : Modifier/Retirer sa voiture
- **F3.3** : Vue des voitures disponibles et places restantes

#### F4 : Attribution des places
- **F4.1** : Rejoindre une voiture (si places disponibles et non banni)
- **F4.2** : Quitter une voiture
- **F4.3** : Vue de qui est dans quelle voiture
- **F4.4** : Le conducteur peut éjecter un passager

#### F5 : Système de ban (la feature fun)
- **F5.1** : Bannir quelqu'un de sa voiture (durée : 1 jour à 2 semaines)
- **F5.2** : Voir ses bans actifs (qui j'ai banni, qui m'a banni)
- **F5.3** : Notification/Message quand on essaie de monter dans une voiture où on est banni
- **F5.4** : Lever un ban manuellement
- **F5.5** : Hall of Fame des bans (stats fun)

### Nice-to-have (V2+)
- Rappel automatique le matin (notification push)
- Historique des trajets
- Stats (nombre de trajets, km parcourus ensemble)
- Intégration calendrier
- Mode sombre

---

## Exigences non-fonctionnelles

### Performance
- Temps de chargement < 2s
- Mise à jour en temps réel (WebSocket ou polling)

### UX/UI
- Mobile-first (usage principal sur téléphone)
- Interface épurée, actions en 2 clics max
- Feedback visuel immédiat

### Technique
- PWA (installable sur téléphone)
- Pas de création de compte complexe (magic link ou OAuth simple)
- Fonctionne offline (affichage de la dernière session connue)

### Sécurité
- Accès limité aux membres du groupe
- Pas de données sensibles stockées

---

## Métriques de succès

1. **Adoption** : 100% du groupe utilise l'app quotidiennement
2. **Friction réduite** : Organisation faite en < 2 minutes
3. **Fun** : Au moins 1 ban par semaine (preuve que la feature est utilisée)

---

## Contraintes

- **Budget** : Projet perso, hébergement gratuit ou très low-cost
- **Timeline** : MVP fonctionnel en 2-3 semaines de dev
- **Stack** : Monorepo pnpm (voir ARCHITECTURE.md)

---

## Décisions prises

1. **Authentification** : OAuth Google + Magic link (au choix de l'utilisateur)
2. **Persistance** : PostgreSQL via Supabase
3. **Temps réel** : Polling simple (toutes les 10s)
4. **Nom de l'app** : Pioum (délire interne validé)
5. **Structure** : Monorepo avec pnpm workspaces

---

## Glossaire

| Terme | Définition |
|-------|------------|
| Session | Instance de covoiturage pour une date donnée |
| Conducteur | Membre qui propose sa voiture |
| Passager | Membre qui rejoint une voiture |
| Ban | Interdiction temporaire de monter dans une voiture spécifique |
