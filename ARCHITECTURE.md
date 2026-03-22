# Architecture - Pioum

## Vue d'ensemble

Pioum est une application web de covoiturage pour groupes d'amis, construite avec une architecture monorepo moderne.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Mobile     │  │   Desktop    │  │   Tablet     │          │
│  │   (PWA)      │  │   Browser    │  │   (PWA)      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          └────────────────┬┴─────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REVERSE PROXY (Nginx/Traefik)                │
│                    - SSL termination                            │
│                    - Load balancing                             │
│                    - Static file serving                        │
└─────────────────────────────────────────────────────────────────┘
          │                                    │
          │ /api/*                             │ /*
          ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│      BACKEND        │              │      FRONTEND       │
│   (Node.js/Express) │              │   (React SPA/PWA)   │
│                     │              │                     │
│ - REST API          │              │ - Vite build        │
│ - Auth (JWT)        │              │ - Service Worker    │
│ - Business logic    │              │ - Zustand state     │
│ - Validation (Zod)  │              │ - Tailwind CSS      │
└─────────┬───────────┘              └─────────────────────┘
          │
          │ Prisma ORM
          ▼
┌─────────────────────┐
│     DATABASE        │
│   (PostgreSQL)      │
│                     │
│ - Users             │
│ - Groups            │
│ - Sessions          │
│ - Cars              │
│ - Bans              │
│ - Avatars           │
└─────────────────────┘
```

---

## Structure du monorepo

```
pioum/
├── packages/
│   ├── backend/              # API Node.js
│   │   ├── src/
│   │   │   ├── routes/       # Endpoints REST
│   │   │   │   ├── auth.ts       # OAuth Google + Magic Link
│   │   │   │   ├── groups.ts     # CRUD groupes
│   │   │   │   ├── sessions.ts   # Sessions avec horaires et récurrences
│   │   │   │   ├── recurrencePatterns.ts  # Patterns de récurrence
│   │   │   │   ├── cars.ts       # Voitures et passagers
│   │   │   │   ├── bans.ts       # Système de ban
│   │   │   │   ├── avatars.ts    # Banque d'avatars
│   │   │   │   ├── users.ts      # Profils utilisateurs
│   │   │   │   └── userCars.ts   # Voitures personnelles
│   │   │   ├── notifications/
│   │   │   │   ├── notification.service.ts    # VAPID, saveSubscription, notifyUser, notifyGroupMembers
│   │   │   │   └── notification.controller.ts # Routes /api/notifications/*
│   │   │   ├── services/
│   │   │   │   └── recurrence.ts # Génération d'occurrences
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts       # JWT verification
│   │   │   │   └── errorHandler.ts
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts        # Client DB
│   │   │   │   ├── jwt.ts           # Token management
│   │   │   │   ├── prismaSelects.ts # Constantes SELECT réutilisables
│   │   │   │   ├── formatDate.ts    # Formatage de date (fr-FR, utilisé dans notifs)
│   │   │   │   └── email.ts         # Envoi emails (magic link)
│   │   │   └── index.ts             # Entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Modèle de données
│   │   │   └── seed.ts           # Données initiales
│   │   └── package.json
│   │
│   └── frontend/             # App React
│       ├── src/
│       │   ├── components/   # Composants réutilisables
│       │   │   ├── Avatar.tsx
│       │   │   ├── CarCard.tsx
│       │   │   ├── SessionCard.tsx
│       │   │   ├── UpcomingSessionsList.tsx
│       │   │   ├── MonthCalendar.tsx
│       │   │   ├── CreateSessionModal.tsx
│       │   │   ├── CreateRecurrenceModal.tsx
│       │   │   ├── EditSessionModal.tsx
│       │   │   ├── DeleteSessionModal.tsx
│       │   │   ├── BanModal.tsx
│       │   │   ├── UserCarCard.tsx
│       │   │   ├── UserCarSelector.tsx
│       │   │   ├── GroupSettingsModal.tsx
│       │   │   └── ...
│       │   ├── pages/        # Vues principales
│       │   │   ├── LoginPage.tsx
│       │   │   ├── HomePage.tsx
│       │   │   ├── GroupPage.tsx
│       │   │   ├── ProfilePage.tsx
│       │   │   ├── BansPage.tsx
│       │   │   └── ...
│       │   ├── stores/       # État global (Zustand)
│       │   │   ├── auth.ts
│       │   │   ├── groups.ts
│       │   │   ├── session.ts
│       │   │   └── userCars.ts
│       │   ├── lib/
│       │   │   ├── api.ts    # Client API
│       │   │   └── utils.ts  # Helpers (isImageUrl, etc.)
│       │   └── App.tsx
│       ├── public/
│       │   └── avatars/      # Images avatars
│       │       ├── users/    # Avatars utilisateurs
│       │       ├── cars/     # Avatars voitures
│       │       └── groups/   # Avatars groupes
│       └── package.json
│
├── docker-compose.yml        # Orchestration dev/prod
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf                # Config reverse proxy
└── package.json              # Workspace root
```

---

## Modèle de données

```
┌──────────────┐
│    Avatar    │
├──────────────┤
│ id           │
│ name         │
│ imageUrl     │
│ category     │  (users/cars/groups)
└──────┬───────┘
       │ 1
       │
       │ 0..1
┌──────▼───────┐         ┌──────────────┐
│     User     │◄────────┤ GroupMember  │
├──────────────┤    *    ├──────────────┤
│ id           │         │ id           │
│ name         │         │ role         │────┐
│ email        │         │ joinedAt     │    │
│ avatarId     │         └──────────────┘    │
│ customAvatar │                │            │
└──────────────┘                │ *          │
       │                        │            │
       │ *                      │ 1          │
       │                 ┌──────▼───────┐    │
       │                 │    Group     │    │
       │                 ├──────────────┤    │
       │                 │ id           │    │
       │                 │ name         │    │
       │                 │ inviteCode   │    │
       │                 │ avatarId     │    │
       │                 └──────────────┘    │
       │                        │            │
       │                        │ *          │
       │       ┌────────────────┼────────────┘
       │       │                │
       │       ▼                ▼
       │  ┌────────────────┐  ┌──────────────┐
       │  │ Recurrence     │  │   Session    │
       │  │ Pattern        │  ├──────────────┤
       │  ├────────────────┤  │ id           │
       │  │ id             │  │ date         │
       │  │ groupId        │  │ startTime    │
       │  │ startTime      │  │ endTime      │
       │  │ endTime        │  │ groupId      │
       │  │ daysOfWeek[]   │◄─│ recurrence   │
       │  │ startDate      │  │ PatternId?   │
       │  │ endDate?       │  │ createdById? │
       │  │ createdById    │  └──────────────┘
       │  └────────────────┘    │           │
       │                 *──────┘           └────*
       │                │                        │
       │    ┌───────────▼───┐    ┌───────────────┐
       │    │     Car       │    │   Passenger   │
       │    ├───────────────┤    ├───────────────┤
       └───►│ driverId      │    │ userId        │
            │ seats         │◄───│ carId (opt)   │
            │ sessionId     │  * │ sessionId     │
            │ userCarId     │    └───────────────┘
            └──────┬────────┘
                   │
                   │ 0..1
            ┌──────▼───────┐
            │   UserCar    │  (voiture personnelle)
            ├──────────────┤
            │ id           │
            │ userId       │
            │ name         │
            │ avatarId     │
            │ defaultSeats │
            └──────────────┘

       ┌──────────────┐
       │     Ban      │
       ├──────────────┤
       │ giverId      │◄──── giver (User)
       │ receiverId   │◄──── receiver (User)
       │ reason       │
       │ startsAt     │
       │ endsAt       │
       │ liftedAt     │  (nullable, pour lever le ban)
       └──────────────┘

       ┌──────────────────┐
       │ PushSubscription │
       ├──────────────────┤
       │ userId  @unique  │◄──── User
       │ endpoint @unique │  (URL push service)
       │ p256dh           │
       │ auth             │
       └──────────────────┘
```

---

## Flux d'authentification

### OAuth Google
```
┌────────┐     ┌──────────┐     ┌────────────┐     ┌─────────┐
│ Client │     │ Frontend │     │  Backend   │     │ Google  │
└───┬────┘     └────┬─────┘     └─────┬──────┘     └────┬────┘
    │               │                 │                 │
    │ Click Login   │                 │                 │
    ├──────────────►│                 │                 │
    │               │                 │                 │
    │               │ Google Sign-In  │                 │
    │               ├────────────────────────────────────►
    │               │                 │                 │
    │               │◄───────────────────────────────────┤
    │               │   ID Token      │                 │
    │               │                 │                 │
    │               │ POST /auth/google                 │
    │               ├────────────────►│                 │
    │               │   {idToken}     │                 │
    │               │                 │                 │
    │               │                 │ Verify token    │
    │               │                 ├────────────────►│
    │               │                 │◄────────────────┤
    │               │                 │                 │
    │               │◄────────────────┤                 │
    │               │ {token, user}   │                 │
    │               │                 │                 │
    │◄──────────────┤                 │                 │
    │  Logged in    │                 │                 │
```

### Magic Link
```
┌────────┐     ┌──────────┐     ┌─────────┐     ┌───────┐
│ Client │     │ Frontend │     │ Backend │     │ SMTP  │
└───┬────┘     └────┬─────┘     └────┬────┘     └───┬───┘
    │               │                │              │
    │ Enter email   │                │              │
    ├──────────────►│                │              │
    │               │                │              │
    │               │ POST /auth/magic-link         │
    │               ├───────────────►│              │
    │               │                │              │
    │               │                │ Send email   │
    │               │                ├─────────────►│
    │               │                │              │
    │               │◄───────────────┤              │
    │               │ "Check email"  │              │
    │               │                │              │
    │◄──────────────┤                │              │
    │               │                │              │
    │ Click link    │                │              │
    ├──────────────►│                │              │
    │               │                │              │
    │               │ GET /auth/verify?token=xxx    │
    │               ├───────────────►│              │
    │               │                │              │
    │               │◄───────────────┤              │
    │               │ {token, user}  │              │
    │◄──────────────┤                │              │
    │  Logged in    │                │              │
```

---

## Flux temps réel (Polling)

```
┌────────┐                    ┌─────────┐
│ Client │                    │ Backend │
└───┬────┘                    └────┬────┘
    │                              │
    │ GET /sessions/today/:groupId │
    ├─────────────────────────────►│
    │◄─────────────────────────────┤
    │         {session}            │
    │                              │
    │      ... 10 seconds ...      │
    │                              │
    │ GET /sessions/today/:groupId │
    ├─────────────────────────────►│
    │◄─────────────────────────────┤
    │         {session}            │
    │                              │
    │      ... 10 seconds ...      │
    │              ↓               │
```

---

## Sécurité

### Authentification
- **JWT** : Tokens signés avec expiration 7 jours
- **Cookies HttpOnly** : Protection XSS
- **OAuth Google** : Délégation à un provider de confiance

### Autorisation
- Vérification membership groupe sur chaque requête
- Seul le conducteur peut bannir de sa voiture
- Seul l'admin peut régénérer le code d'invitation

### Validation
- **Zod** : Validation des entrées côté serveur
- **TypeScript** : Typage statique bout en bout

### Données sensibles
- Mots de passe : Non stockés (OAuth/Magic Link)
- Secrets : Variables d'environnement uniquement
- Logs : Pas de données personnelles

---

## Déploiement

### Architecture de production (Self-hosted)

```
┌─────────────────────────────────────────────────────┐
│                     NAS / VPS                        │
│  ┌───────────────────────────────────────────────┐  │
│  │              Docker Compose                    │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │           Traefik / Nginx               │  │  │
│  │  │      (Reverse Proxy + SSL + CORS)       │  │  │
│  │  │           :80 → :443 redirect           │  │  │
│  │  └─────────────────┬───────────────────────┘  │  │
│  │                    │                          │  │
│  │       ┌────────────┼────────────┐             │  │
│  │       ▼            ▼            ▼             │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │  │Frontend │ │ Backend  │ │ Postgres │       │  │
│  │  │ :80     │ │ :3000    │ │ :5432    │       │  │
│  │  └─────────┘ └──────────┘ └──────────┘       │  │
│  │                    │             │            │  │
│  │                    └─────────────┘            │  │
│  │                      DB connection            │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  Volumes:                                           │
│  - postgres_data (persistent)                       │
│  - avatars (custom images)                          │
└─────────────────────────────────────────────────────┘
```

### Variables d'environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `DATABASE_URL` | URL PostgreSQL | Oui |
| `JWT_SECRET` | Clé secrète JWT (32+ chars) | Oui |
| `FRONTEND_URL` | URL publique frontend | Oui |
| `GOOGLE_CLIENT_ID` | OAuth Google | Non* |
| `GOOGLE_CLIENT_SECRET` | OAuth Google | Non* |
| `SMTP_HOST` | Serveur SMTP | Non* |
| `SMTP_USER` | User SMTP | Non* |
| `SMTP_PASS` | Password SMTP | Non* |
| `VAPID_PUBLIC_KEY` | Clé publique VAPID (Web Push) | Non** |
| `VAPID_PRIVATE_KEY_JWK` | Clé privée VAPID au format JWK JSON | Non** |
| `VAPID_EMAIL` | Contact admin pour VAPID (`mailto:…`) | Non** |

*Au moins une méthode d'auth requise
**Requis ensemble pour activer les notifications push. Si `VAPID_PRIVATE_KEY_JWK` est présent, le format JWK est validé au démarrage.

---

## Scalabilité

### Limites actuelles
- Polling toutes les 10s (pas de WebSocket)
- Single instance backend
- Pas de cache Redis

### Évolutions possibles
1. **WebSocket** pour le temps réel
2. **Redis** pour le cache de sessions
3. **CDN** pour les assets statiques
4. **Réplicas** backend avec load balancer

### Métriques à surveiller
- Requêtes/seconde sur `/sessions/today`
- Latence P95 des API
- Connexions DB actives
- Taille de la table `Session`

---

## Tests

### Backend
- **Vitest** : Tests unitaires
- **Supertest** : Tests d'intégration API
- Coverage cible : 60%+

### Frontend
- **Vitest** + **Testing Library** : Tests composants
- **Playwright** : Tests E2E (optionnel)

### Commandes
```bash
pnpm test              # Tous les tests
pnpm test:backend      # Backend uniquement
pnpm test:frontend     # Frontend uniquement
pnpm test:coverage     # Avec coverage
```

---

## Décisions techniques

| Décision | Choix | Raison |
|----------|-------|--------|
| Monorepo | pnpm workspaces | Simplicité, pas besoin de Turborepo |
| ORM | Prisma | DX, migrations, typage |
| State | Zustand | Léger, simple, pas de boilerplate |
| Styling | Tailwind | Productivité, cohérence |
| Auth | OAuth + Magic Link | Pas de gestion de mots de passe |
| Temps réel | Polling | MVP simple, suffisant pour 2-8 users |
| Container | Docker | Portabilité, reproductibilité |
