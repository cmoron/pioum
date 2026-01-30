# Documentation Complète - Pioum

Documentation détaillée du projet Pioum. Pour un démarrage rapide, voir [README.md](./README.md).

## Table des Matières

1. [Architecture](#architecture)
2. [Guide de Développement](#guide-de-développement)
3. [Tests](#tests)
4. [CI/CD](#cicd)
5. [Troubleshooting](#troubleshooting)

---

## Architecture

### Vue d'ensemble

Pioum est une application web de covoiturage construite avec une architecture monorepo moderne :

```
┌─────────────────────────────────────────────────────────────────┐
│                    Clients (Web, Mobile, PWA)                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                          HTTPS / HTTP
                                │
┌─────────────────────────────────────────────────────────────────┐
│         Reverse Proxy (Traefik/Nginx)                            │
│         - SSL termination                                        │
│         - Load balancing                                         │
└─────────────────────────────────────────────────────────────────┘
     │ /api/*                                    │ /*
     ▼                                           ▼
┌──────────────────┐                  ┌──────────────────┐
│ Backend          │                  │ Frontend         │
│ Node.js/Express  │                  │ React SPA + PWA  │
│ Port: 3000       │                  │ Port: 5173/80    │
└────────┬─────────┘                  └──────────────────┘
         │
         │ Prisma ORM
         ▼
┌──────────────────┐
│ PostgreSQL       │
│ Port: 5432       │
└──────────────────┘
```

### Monorepo Structure

```
pioum/
├── packages/
│   ├── backend/              # API Express + Prisma
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point
│   │   │   ├── routes/           # API endpoints
│   │   │   │   ├── auth.ts       # Authentification
│   │   │   │   ├── groups.ts     # Gestion groupes
│   │   │   │   ├── sessions.ts   # Sessions avec horaires et récurrences
│   │   │   │   ├── recurrencePatterns.ts  # Patterns de récurrence
│   │   │   │   ├── cars.ts       # Voitures et passagers
│   │   │   │   ├── bans.ts       # Système de ban
│   │   │   │   ├── avatars.ts    # Avatars
│   │   │   │   ├── users.ts      # Profils
│   │   │   │   └── userCars.ts   # Voitures perso
│   │   │   ├── services/
│   │   │   │   └── recurrence.ts # Génération d'occurrences
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts       # JWT verification
│   │   │   │   └── errorHandler.ts
│   │   │   └── lib/
│   │   │       ├── prisma.ts     # DB client
│   │   │       ├── jwt.ts        # Token management
│   │   │       ├── email.ts      # Email sending
│   │   │       └── prismaSelects.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Modèle de données
│   │   │   └── seed.ts           # Données initiales
│   │   ├── vitest.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── frontend/             # App React
│       ├── src/
│       │   ├── App.tsx           # Root component
│       │   ├── components/       # Composants réutilisables
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
│       │   │   ├── LoadingSpinner.tsx
│       │   │   └── ...
│       │   ├── pages/            # Vues principales
│       │   │   ├── LoginPage.tsx
│       │   │   ├── HomePage.tsx
│       │   │   ├── GroupPage.tsx
│       │   │   ├── ProfilePage.tsx
│       │   │   └── ...
│       │   ├── stores/           # État global (Zustand)
│       │   │   ├── auth.ts
│       │   │   ├── groups.ts
│       │   │   ├── session.ts
│       │   │   └── userCars.ts
│       │   ├── lib/
│       │   │   ├── api.ts        # Client API
│       │   │   └── utils.ts      # Helpers
│       │   ├── styles/
│       │   └── index.css         # Tailwind
│       ├── public/
│       │   └── avatars/          # Images avatars
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       └── package.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml               # Main CI pipeline
│       ├── ci-simple.yml        # Simple build check
│       └── README.md            # Workflow documentation
│
├── docker-compose.yml           # Dev environment
├── docker-compose.prod.yml      # Production environment
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf
├── ARCHITECTURE.md
├── DEV_GUIDE.md
├── README.md
├── DOCUMENTATION.md             # This file
├── CLAUDE.md                    # Dev guidelines
└── package.json                 # pnpm workspaces
```

### Modèle de Données

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour le diagramme ER complet. Entités principales:

- **User** - Utilisateur avec profil et avatar
- **Group** - Groupe de covoiturage avec code d'invitation
- **GroupMember** - Relation User-Group avec rôle (admin/member)
- **RecurrencePattern** - Pattern de récurrence (jours de semaine, horaires)
- **Session** - Instance covoiturage avec startTime/endTime et lien vers pattern
- **Car** - Voiture déclarée par un conducteur pour une session
- **Passenger** - Relation User-Car pour une session
- **UserCar** - Voiture personnelle d'un utilisateur
- **Ban** - Ban temporaire avec raison et durée
- **Avatar** - Avatar réutilisable (users, cars, groups)

### Flux Authentification

#### OAuth Google
1. Client → Frontend : Click "Login with Google"
2. Frontend → Google : Demande ID Token
3. Google → Frontend : Retourne ID Token
4. Frontend → Backend : POST /api/auth/google avec ID Token
5. Backend : Vérifie token avec Google
6. Backend → Frontend : Retourne JWT + User info
7. Frontend : Stocke JWT en cookie HttpOnly

#### Magic Link
1. Client → Frontend : Entre son email
2. Frontend → Backend : POST /api/auth/magic-link
3. Backend : Génère token + envoie email avec lien
4. Client : Clique sur lien magic-link/verify?token=xxx
5. Backend : Vérifie token + crée session
6. Backend → Frontend : Retourne JWT + User info

### Sécurité

- **Authentification** : JWT signés avec expiration 7 jours
- **Stockage Token** : Cookies HttpOnly (protection XSS)
- **CSRF Protection** : Via SameSite=Strict sur cookies
- **Validation Input** : Zod côté serveur
- **Typage** : TypeScript end-to-end
- **Rate Limiting** : express-rate-limit (sauf dev)
- **CORS** : Configuré pour localhost:5173 en dev

---

## Guide de Développement

### Installation & Configuration

#### Prérequis
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL 16 (ou Docker)

#### Option 1: Mode Hybride (Recommandé)

DB en Docker, Backend + Frontend en local avec hot reload:

```bash
# 1. Clone et installe
git clone <repo-url>
cd pioum
pnpm install

# 2. Lance PostgreSQL en Docker
docker compose up db

# 3. Backend - dans un nouveau terminal
cd packages/backend

# Crée le fichier .env
cp .env.example .env
# Édite .env avec DATABASE_URL pointant vers localhost:5432

pnpm db:generate   # Génère client Prisma
pnpm db:push       # Crée tables
pnpm db:seed       # Insère avatars
pnpm dev           # Démarre sur :3000 avec hot reload

# 4. Frontend - dans un nouveau terminal
cd packages/frontend
cp .env.example .env
pnpm dev           # Démarre sur :5173 avec hot reload
```

**Variables d'environnement** :

Backend (`.env`) :
```env
DATABASE_URL="postgresql://pioum:pioum@localhost:5432/pioum?schema=public"
JWT_SECRET="dev-secret-key"
GOOGLE_CLIENT_ID="your-id"
GOOGLE_CLIENT_SECRET="your-secret"
FRONTEND_URL="http://localhost:5173"
PORT=3000
NODE_ENV=development
```

Frontend (`.env`) :
```env
VITE_API_URL="http://localhost:3000"
```

#### Option 2: Full Docker

Tout dans Docker (moins de hot reload):

```bash
docker compose up --build
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

#### Option 3: Full Local

PostgreSQL doit être installé localement:

```bash
pnpm install
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev  # Lance backend + frontend en parallèle
```

### Workflow Prisma (Base de Données)

```
Modifie schema.prisma
        │
        ▼
    pnpm db:push      ← Applique les changements
        │
        ▼
  pnpm db:generate    ← Regénère types TypeScript
        │
        ▼
  Backend redémarre automatiquement (tsx watch)
```

**Commandes principales** :

| Commande | Effet |
|----------|-------|
| `pnpm db:generate` | Génère client Prisma + types (après modif schema) |
| `pnpm db:push` | Pousse schéma vers DB (dev mode uniquement) |
| `pnpm db:seed` | Insère données initiales (avatars, etc.) |
| `pnpm db:studio` | UI web pour explorer/éditer DB (localhost:5555) |

**Exemple: Ajouter un champ**

```prisma
// schema.prisma
model User {
  id     String @id @default(cuid())
  email  String @unique
  xp     Int    @default(0)  // Nouveau champ
}
```

```bash
pnpm db:push      # Crée la colonne en DB
pnpm db:generate  # Regénère types TS
# Backend hot reload automatiquement
```

### Commandes Courantes

**À la racine** :
```bash
pnpm dev          # Backend + Frontend hot reload
pnpm build        # Build production (frontend: SPA, backend: dist/)
pnpm lint         # Lint tous packages
pnpm test         # Tests en watch mode
pnpm test:run     # Tests une seule fois (CI mode)
```

**Backend** (`packages/backend`) :
```bash
pnpm dev          # tsx watch (hot reload)
pnpm build        # tsc
pnpm lint         # eslint
pnpm test         # vitest watch
pnpm test:run     # vitest run
```

**Frontend** (`packages/frontend`) :
```bash
pnpm dev          # Vite dev server
pnpm build        # Build SPA production
pnpm preview      # Preview du build
pnpm lint         # eslint
pnpm test         # vitest watch
pnpm test:run     # vitest run
```

### Configuration Google OAuth

1. Ouvre [Google Cloud Console](https://console.cloud.google.com)
2. Create project
3. APIs & Services → Enable "Google+ API"
4. Credentials → Create OAuth 2.0 Client ID (Web application)
5. Authorized origins: `http://localhost:5173`
6. Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
7. Copie Client ID et Secret dans `packages/backend/.env`

### Dev Login (Multi-utilisateurs)

Pour tester avec plusieurs comptes sans OAuth:

```bash
curl -X POST http://localhost:3000/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@example.com", "name": "User One"}'
```

Retourne un cookie JWT valide. **Uniquement en `NODE_ENV=development`**.

### Code Style & Linting

ESLint est configuré pour enforcer:
- TypeScript strict mode
- React hooks rules
- No console warnings
- Trailing commas
- Import sorting

```bash
pnpm lint           # Vérifie violations
pnpm lint --fix     # Corrige automatiquement
```

---

## Tests

### Couverture Actuelle

- **195 tests** au total
- **61 tests backend** (100% coverage sur lib + middleware)
- **134 tests frontend** (100% coverage sur stores + utils)
- **Exécution** : < 2 secondes
- **Status** : Tous passent ✅

### Structure des Tests

```
packages/backend/src/
├── lib/
│   ├── jwt.test.ts           (12 tests) ✅ 100%
│   ├── params.test.ts        (8 tests)  ✅ 100%
│   └── email.test.ts         (14 tests) ✅ 100%
├── middleware/
│   ├── auth.test.ts          (13 tests) ✅ 100%
│   └── errorHandler.test.ts  (14 tests) ✅ 100%
└── routes/
    └── auth.test.ts          (3 tests, skipped - integration)

packages/frontend/src/
├── lib/
│   ├── utils.test.ts         (25 tests) ✅ 100%
│   └── api.test.ts           (13 tests) ✅ partial
├── stores/
│   ├── auth.test.ts          (27 tests) ✅ 100%
│   ├── groups.test.ts        (25 tests) ✅ 100%
│   └── userCars.test.ts      (22 tests) ✅ 100%
└── components/
    ├── Avatar.test.tsx       (3 tests)  ✅ 100%
    └── LoadingSpinner.test.tsx (19 tests) ✅ 100%
```

### Exécuter les Tests

```bash
# Tous les tests
pnpm test:run

# Avec rapport de coverage
pnpm test:run --coverage

# En watch mode (développement)
pnpm test

# Backend spécifique
cd packages/backend && pnpm test:run

# Frontend spécifique
cd packages/frontend && pnpm test:run

# Un fichier spécifique
pnpm test src/lib/jwt.test.ts

# Pattern matching
pnpm test auth
```

### Patterns de Test

#### 1. AAA Pattern (Arrange, Act, Assert)

```typescript
it('should validate email', () => {
  // Arrange
  const email = 'test@example.com'

  // Act
  const result = isValidEmail(email)

  // Assert
  expect(result).toBe(true)
})
```

#### 2. Async Testing

```typescript
it('should fetch user data', async () => {
  // Mock l'API
  vi.mocked(api.fetchUser).mockResolvedValue({ id: '1', name: 'John' })

  // Appelle action async
  await store.loadUser('1')

  // Vérifie state
  expect(store.user).toEqual({ id: '1', name: 'John' })
})
```

#### 3. Error Testing

```typescript
it('should handle API errors', async () => {
  vi.mocked(api.fetch).mockRejectedValue(new Error('Network error'))

  await expect(store.fetchData()).rejects.toThrow('Network error')
})
```

#### 4. State Testing (Zustand)

```typescript
it('should manage auth state', () => {
  const store = useAuthStore.getState()

  // Arrange
  store.setLoading(true)

  // Assert
  expect(store.loading).toBe(true)
})
```

### Test Coverage Report

Voir [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md) pour le rapport détaillé.

---

## CI/CD

### GitHub Actions Workflows

#### Main CI Pipeline (`.github/workflows/ci.yml`)

Déclenché sur: Push et PR vers `main`

**Étapes** :
1. Checkout code
2. Setup Node 20 + pnpm 9
3. Install with frozen lockfile
4. Lint all packages
5. Generate Prisma Client
6. Push schema to test DB
7. Run tests (195 tests)
8. Build all packages

**Services** :
- PostgreSQL 16 (test database)

**Environment** :
```yaml
NODE_ENV: test
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/pioum_test
JWT_SECRET: test-secret
```

#### Simple Build Check (`.github/workflows/ci-simple.yml`)

Déclenché sur: Manuel (`workflow_dispatch`)

**Étapes** :
1. Checkout
2. Setup Node + pnpm
3. Install
4. Lint
5. Generate Prisma
6. Build

**Note** : Aucun test, validation du build uniquement.

### Statut des Builds

Voir les workflows sur : https://github.com/<owner>/pioum/actions

---

## Troubleshooting

### Erreur: "ECONNREFUSED" sur /api/*

**Cause** : Frontend ne peut pas joindre le backend.

**Solutions** :
```bash
# 1. Vérifie que le backend tourne
curl http://localhost:3000/api/avatars

# 2. Vérifie VITE_API_URL en frontend/.env
cat packages/frontend/.env

# 3. En Docker, proxy doit être http://backend:3000
# Vérifie vite.config.ts

# 4. Si besoin, redémarre les services
docker compose restart backend
pnpm -r run dev
```

### Erreur: "PrismaClientInitializationError"

**Cause** : Client Prisma pas généré ou DB pas accessible.

```bash
# Regénère client
pnpm db:generate

# Applique schéma
pnpm db:push

# Vérifie DB connection
psql $DATABASE_URL -c "SELECT 1"
```

### Types TypeScript manquants après modif schema

```bash
# Regénère types
pnpm db:generate

# Redémarre IDE / restart TypeScript server
# Pour VS Code: Cmd+Shift+P → TypeScript: Restart TS Server
```

### La DB semble vide (pas d'avatars)

```bash
# Insère les données
pnpm db:seed

# Vérifie les données
docker exec pioum-db psql -U pioum -d pioum -c "SELECT COUNT(*) FROM Avatar"
```

### Reset Complet

```bash
# Supprime tout (volumes, nodes_modules)
docker compose down -v
rm -rf node_modules packages/*/node_modules

# Réinstalle
pnpm install

# Relance DB
docker compose up db

# Recrée schema + données
pnpm db:push && pnpm db:seed

# Redémarre services
pnpm dev
```

### Tests Flaky ou Lents

```bash
# Efface cache vitest
rm -rf node_modules/.vitest

# Réinstalle
pnpm install

# Re-run
pnpm test:run
```

### Problème avec pnpm Store

```bash
# Efface store
pnpm store prune

# Réinstalle
pnpm install --force

# Relance
pnpm dev
```

### Docker Build Fails

```bash
# Efface images et caches
docker compose down -v
docker system prune -a --volumes

# Relance
docker compose up --build
```

### Rate Limiter Active en Dev

```bash
# Vérifie NODE_ENV=development dans .env backend
cat packages/backend/.env | grep NODE_ENV

# Rate limiter est désactivé en dev mode automatiquement
# Si erreur 429, redémarre backend
```

---

## Best Practices

### Code Quality
- TypeScript strict mode partout
- Pas de `any` types
- Imports explicites
- Modules petits et focalisés
- Functions pures quand possible

### Architecture
- Séparation concerns (routes, middleware, lib)
- Composition over inheritance
- Interfaces/contracts explicites
- State management centralisé (Zustand)

### Commits
- Messages clairs en français ou anglais
- Référence l'issue/PR si applicable
- Convention: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`

### Reviews
- Tests required avant merge
- Linting must pass
- Coverage > 60% pour les modules modifiés

---

## Ressources

- [README.md](./README.md) - Quick start
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture détaillée
- [DEV_GUIDE.md](./DEV_GUIDE.md) - Guide développement (modes setup)
- [CLAUDE.md](./CLAUDE.md) - Dev guidelines du projet
- [.github/workflows/README.md](./.github/workflows/README.md) - Workflows CI/CD

---

**Dernière mise à jour** : 2026-01-29
