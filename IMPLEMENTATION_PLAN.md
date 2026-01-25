# Plan d'implémentation - Pioum

## Stack technique proposée

### Frontend
- **Framework** : React + TypeScript
- **Styling** : Tailwind CSS
- **State** : Zustand (léger, simple)
- **PWA** : Vite PWA plugin

### Backend
- **Runtime** : Node.js
- **Framework** : Express.js ou Fastify
- **ORM** : Prisma
- **Base de données** : PostgreSQL (via Supabase free tier ou Railway)

### Infrastructure
- **Hébergement Frontend** : Vercel (gratuit)
- **Hébergement Backend** : Railway ou Render (free tier)
- **Base de données** : Supabase PostgreSQL (free tier)

### Temps réel
- Polling simple toutes les 10s (choix validé pour le MVP)

### Authentification
- OAuth Google + Magic link (les deux options disponibles)

---

## Architecture de données

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────<│ GroupMember │>────│    Group    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │            ┌─────────────┐            │
       └───────────>│   Session   │<───────────┘
                    └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │   Car    │ │Passenger │ │   Ban    │
       └──────────┘ └──────────┘ └──────────┘
```

### Modèles de données

```prisma
model User {
  id             String   @id @default(cuid())
  name           String
  email          String?  @unique
  avatarId       String?  // Référence vers un avatar prédéfini
  customAvatarUrl String? // URL d'un avatar uploadé
  createdAt      DateTime @default(now())

  avatar       Avatar?       @relation(fields: [avatarId], references: [id])
  memberships  GroupMember[]
  cars         Car[]
  passengers   Passenger[]
  bansGiven    Ban[]         @relation("BanGiver")
  bansReceived Ban[]         @relation("BanReceiver")
}

model Avatar {
  id       String  @id @default(cuid())
  name     String  // Nom de l'avatar (pour la sélection)
  imageUrl String  // URL de l'image
  category String? // Catégorie optionnelle (ex: "muscu", "fun", etc.)

  users User[]
}

model Group {
  id         String   @id @default(cuid())
  name       String
  inviteCode String   @unique
  createdAt  DateTime @default(now())

  members  GroupMember[]
  sessions Session[]
}

model GroupMember {
  id       String   @id @default(cuid())
  userId   String
  groupId  String
  role     String   @default("member") // "admin" | "member"
  joinedAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id])
  group Group @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
}

model Session {
  id        String   @id @default(cuid())
  groupId   String
  date      DateTime @db.Date
  createdAt DateTime @default(now())

  group      Group       @relation(fields: [groupId], references: [id])
  cars       Car[]
  passengers Passenger[]

  @@unique([groupId, date])
}

model Car {
  id        String @id @default(cuid())
  sessionId String
  driverId  String
  seats     Int    // Places disponibles (hors conducteur)

  session    Session     @relation(fields: [sessionId], references: [id])
  driver     User        @relation(fields: [driverId], references: [id])
  passengers Passenger[]

  @@unique([sessionId, driverId])
}

model Passenger {
  id        String   @id @default(cuid())
  sessionId String
  userId    String
  carId     String?  // null = participe mais pas encore dans une voiture
  joinedAt  DateTime @default(now())

  session Session @relation(fields: [sessionId], references: [id])
  user    User    @relation(fields: [userId], references: [id])
  car     Car?    @relation(fields: [carId], references: [id])

  @@unique([sessionId, userId])
}

model Ban {
  id         String   @id @default(cuid())
  giverId    String   // Celui qui ban
  receiverId String   // Celui qui est banni
  reason     String?  // Message fun optionnel
  startsAt   DateTime @default(now())
  endsAt     DateTime

  giver    User @relation("BanGiver", fields: [giverId], references: [id])
  receiver User @relation("BanReceiver", fields: [receiverId], references: [id])

  @@index([giverId, receiverId, endsAt])
}
```

---

## Stages d'implémentation

## Stage 1 : Setup & Infrastructure
**Goal**: Projet initialisé avec CI/CD, base de données connectée, déploiement automatique.

**Success Criteria**:
- `npm run dev` lance le frontend et le backend
- La base de données est accessible
- Un déploiement de test fonctionne

**Tests**:
- [ ] Health check endpoint `/api/health` retourne 200
- [ ] Connexion DB réussie

**Tâches**:
1. Initialiser monorepo (pnpm workspaces ou Turborepo)
2. Setup frontend React + Vite + TypeScript + Tailwind
3. Setup backend Node.js + Express/Fastify + Prisma
4. Configurer PostgreSQL (Supabase)
5. Configurer déploiement (Vercel + Railway/Render)
6. Setup ESLint, Prettier, Husky

**Status**: Complete

---

## Stage 2 : Authentification & Groupes
**Goal**: Les utilisateurs peuvent créer un compte, créer un groupe et inviter des amis.

**Success Criteria**:
- Un utilisateur peut s'inscrire/se connecter (OAuth Google OU magic link)
- Un utilisateur peut créer un groupe
- Un utilisateur peut rejoindre un groupe via code d'invitation
- Un utilisateur peut choisir son avatar

**Tests**:
- [ ] API: POST /auth/google - auth via Google
- [ ] API: POST /auth/magic-link - envoie un magic link
- [ ] API: GET /auth/verify - vérifie le token magic link
- [ ] API: POST /groups - crée un groupe
- [ ] API: POST /groups/join - rejoint via code
- [ ] API: GET /avatars - liste les avatars disponibles
- [ ] API: PATCH /users/me - met à jour le profil (nom, avatar)
- [ ] UI: Flow de connexion complet (choix Google ou email)
- [ ] UI: Sélection d'avatar à l'inscription
- [ ] UI: Création de groupe
- [ ] UI: Rejoindre un groupe

**Tâches**:
1. Implémenter OAuth Google
2. Implémenter magic link (envoi email + vérification)
3. Seed de la banque d'avatars prédéfinis
4. Endpoints CRUD groupes
5. Système d'invitation par code
6. Endpoint mise à jour profil + avatar
7. UI: Pages login avec choix de méthode
8. UI: Sélecteur d'avatar
9. UI: Pages création/rejoindre groupe
10. Middleware d'authentification

**Status**: Not Started

---

## Stage 3 : Sessions & Participation
**Goal**: Les membres peuvent voir la session du jour et indiquer leur participation.

**Success Criteria**:
- Session créée automatiquement pour aujourd'hui
- Chaque membre peut indiquer "Je viens" / "Je ne viens pas"
- Liste des participants visible en temps réel

**Tests**:
- [ ] API: GET /sessions/today - retourne ou crée la session du jour
- [ ] API: POST /sessions/:id/participate - toggle participation
- [ ] API: GET /sessions/:id - retourne participants
- [ ] UI: Vue session avec liste participants
- [ ] UI: Bouton participation avec feedback immédiat

**Tâches**:
1. Endpoints sessions (get/create today)
2. Endpoint participation (join/leave)
3. UI: Dashboard principal avec session du jour
4. UI: Liste des participants
5. Polling ou WebSocket pour temps réel

**Status**: Not Started

---

## Stage 4 : Voitures & Attribution
**Goal**: Les conducteurs peuvent proposer leur voiture, les passagers peuvent s'y inscrire.

**Success Criteria**:
- Un participant peut déclarer sa voiture avec X places
- Un participant peut rejoindre une voiture disponible
- Vue claire de qui est dans quelle voiture

**Tests**:
- [ ] API: POST /sessions/:id/cars - ajouter sa voiture
- [ ] API: DELETE /sessions/:id/cars/:carId - retirer sa voiture
- [ ] API: POST /cars/:id/join - rejoindre une voiture
- [ ] API: DELETE /cars/:id/leave - quitter une voiture
- [ ] UI: Formulaire "J'ai ma voiture" avec nombre de places
- [ ] UI: Liste des voitures avec occupants
- [ ] UI: Bouton rejoindre (grisé si complet)

**Tâches**:
1. Endpoints CRUD voitures
2. Endpoints join/leave voiture
3. Validation places disponibles
4. UI: Section voitures sur le dashboard
5. UI: Cards voitures avec passagers
6. UI: Actions rejoindre/quitter

**Status**: Not Started

---

## Stage 5 : Système de Ban
**Goal**: Les conducteurs peuvent bannir des passagers de leur voiture (feature fun).

**Success Criteria**:
- Un conducteur peut bannir quelqu'un pour une durée choisie
- Un utilisateur banni ne peut pas rejoindre la voiture
- Message fun affiché quand on tente de rejoindre une voiture où on est banni
- Vue des bans actifs

**Tests**:
- [ ] API: POST /bans - créer un ban
- [ ] API: DELETE /bans/:id - lever un ban
- [ ] API: GET /bans/active - mes bans actifs (donnés et reçus)
- [ ] API: POST /cars/:id/join avec ban actif - retourne 403 avec message
- [ ] UI: Bouton ban sur chaque passager (pour le conducteur)
- [ ] UI: Modal de confirmation avec durée
- [ ] UI: Badge "banni" sur les voitures où on est banni
- [ ] UI: Page/Section "Mes bans"

**Tâches**:
1. Endpoints CRUD bans
2. Logique de vérification ban dans join voiture
3. Expiration automatique des bans (cron ou check à la volée)
4. UI: Bouton ban avec modal
5. UI: Indicateur visuel voiture interdite
6. UI: Liste des bans actifs
7. UI: Hall of Fame (optionnel, stats fun)

**Status**: Not Started

---

## Stage 6 : PWA & Polish
**Goal**: L'app est installable, rapide, et agréable à utiliser.

**Success Criteria**:
- Installable sur mobile (PWA)
- Fonctionne offline (affiche dernière session)
- UI responsive et fluide

**Tests**:
- [ ] Lighthouse PWA score > 90
- [ ] App installable sur iOS et Android
- [ ] Mode offline affiche message approprié
- [ ] Pas d'erreur console en production

**Tâches**:
1. Configurer service worker (Vite PWA)
2. Manifest.json avec icônes
3. Cache des assets statiques
4. Gestion état offline
5. Animations et transitions
6. Tests E2E avec Playwright
7. Audit performance et accessibilité

**Status**: Not Started

---

## Priorités et dépendances

```
Stage 1 (Setup)
    │
    ▼
Stage 2 (Auth & Groupes)
    │
    ▼
Stage 3 (Sessions & Participation)
    │
    ▼
Stage 4 (Voitures & Attribution)
    │
    ▼
Stage 5 (Système de Ban)
    │
    ▼
Stage 6 (PWA & Polish)
```

Chaque stage dépend du précédent. Pas de parallélisation possible entre stages.

---

## Estimation de complexité

| Stage | Complexité | Points |
|-------|------------|--------|
| 1. Setup | Faible | 3 |
| 2. Auth & Groupes & Avatars | Élevée | 13 |
| 3. Sessions & Participation | Moyenne | 5 |
| 4. Voitures & Attribution | Moyenne | 8 |
| 5. Système de Ban | Moyenne | 5 |
| 6. PWA & Polish | Faible | 5 |
| **Total** | | **39** |

---

## Risques identifiés

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Envoi emails magic link | Moyen | OAuth Google comme alternative |
| Adoption du groupe | Élevé | Impliquer les potes dans le design |
| Hébergement gratuit limité | Faible | Migration facile si besoin |
| Gestion des avatars customs | Faible | Commencer avec banque prédéfinie uniquement |

---

## Décisions validées

| Question | Décision |
|----------|----------|
| Auth | OAuth Google + Magic link (les deux) |
| Temps réel | Polling simple |
| Structure | Monorepo pnpm workspaces |
| Nom | Pioum |
| Taille groupe | Pas de limite |
| Avatars | Banque prédéfinie + upload custom |

---

## Feature: Avatar pour les groupes

### Stage 1: Modifications du schéma et des données
**Goal**: Ajouter le support des avatars pour les groupes dans la base de données
**Success Criteria**: Le schéma Prisma supporte les avatars de groupes et les avatars sont seedés
**Tests**: Vérifier que `prisma db push` et `seed` fonctionnent sans erreur
**Status**: Complete

#### Modifications effectuées:
- ✅ Ajout du champ `avatarId` au modèle `Group` dans le schéma Prisma
- ✅ Ajout de la relation `avatar` dans le modèle `Group`
- ✅ Ajout de la relation inverse `groups` dans le modèle `Avatar`
- ✅ Ajout de 7 avatars de catégorie "groups" dans le seed

### Stage 2: API Backend
**Goal**: Créer et modifier les endpoints pour supporter les avatars de groupes
**Success Criteria**: Les endpoints retournent l'avatar du groupe et permettent sa modification
**Tests**: Tester les endpoints GET et PATCH pour les groupes
**Status**: Complete

#### Modifications effectuées:
- ✅ Ajout du schéma Zod `updateGroupSchema` pour la validation
- ✅ Ajout de `avatar: true` dans tous les includes de `prisma.group.findUnique/findMany`
- ✅ Création de l'endpoint `PATCH /api/groups/:id` (admin only) pour modifier le nom et l'avatar
- ✅ Transformation correcte des membres dans la réponse

### Stage 3: API Frontend
**Goal**: Ajouter les méthodes et types côté frontend
**Success Criteria**: L'API frontend peut récupérer et modifier l'avatar d'un groupe
**Tests**: Vérifier que les types TypeScript sont corrects
**Status**: Complete

#### Modifications effectuées:
- ✅ Ajout de la méthode `updateGroup` dans `api.ts`
- ✅ Ajout des champs `avatarId` et `avatar` dans l'interface `Group`
- ✅ Mise à jour du store groups avec `updateGroup` et `currentUserRole`
- ✅ Modification de `fetchGroup` pour récupérer le rôle de l'utilisateur

### Stage 4: Interface utilisateur
**Goal**: Afficher l'avatar du groupe et permettre sa modification
**Success Criteria**: L'avatar s'affiche dans le header, les admins peuvent le modifier
**Tests**: Interface utilisateur fonctionnelle, modal de paramètres accessible
**Status**: Complete

#### Modifications effectuées:
- ✅ Création du composant `GroupSettingsModal` pour modifier le nom et l'avatar
- ✅ Affichage de l'avatar du groupe dans le header de `GroupPage`
- ✅ Ajout du bouton paramètres (visible uniquement pour les admins)
- ✅ Gestion de l'état du modal et sauvegarde des modifications

### Commandes à exécuter

#### 1. Mettre à jour la base de données
```bash
cd /home/cyril/pioum/packages/backend
npx prisma db push
```

#### 2. Seed la base de données
```bash
cd /home/cyril/pioum/packages/backend
npm run seed
```

#### 3. Rebuild Docker (optionnel si l'app tourne en Docker)
```bash
cd /home/cyril/pioum
docker compose down
docker compose build
docker compose up -d
```

#### 4. Redémarrer le serveur de développement
```bash
# Backend
cd /home/cyril/pioum/packages/backend
npm run dev

# Frontend
cd /home/cyril/pioum/packages/frontend
npm run dev
```

### Tests à effectuer

1. **Créer un groupe**: Vérifier qu'un groupe sans avatar fonctionne
2. **Modifier un groupe (admin)**: Ouvrir les paramètres, choisir un avatar, sauvegarder
3. **Affichage de l'avatar**: Vérifier que l'avatar s'affiche dans le header
4. **Permissions**: Vérifier qu'un membre non-admin ne voit pas le bouton paramètres
5. **Suppression de l'avatar**: Tester le bouton "Supprimer l'avatar"
