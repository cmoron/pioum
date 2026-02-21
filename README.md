# Pioum - Covoiturage Muscu

Application de covoiturage pour aller à la muscu avec tes potes. Une webapp simple et fun pour organiser les sessions quotidiennes de covoiturage entre amis.

## Fonctionnalités

- **Gestion de groupes** avec code d'invitation
- **Planification de séances** avec horaires de début/fin et vue calendrier mensuel
- **Récurrences** : créer des patterns répétitifs (ex: "tous les lundi-vendredi 11h30-14h")
- **Gestion des voitures** avec déclaration de places disponibles
- **Attribution automatique** des passagers aux voitures
- **Verrouillage automatique** des inscriptions à l'heure de début de séance
- **Système de ban** avec durée configurable (1 jour à 2 semaines)
- **Hall of Fame** des bans (stats fun)
- **Authentification OAuth Google** + Magic Link (sans mot de passe)
- **Avatars personnalisables** pour utilisateurs, voitures et groupes
- **Gestion des voitures personnelles** (UserCar) avec avatars
- **PWA installable** sur mobile

## Stack Technique

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Zustand (state management)
- React Router (routing)

### Backend
- Node.js 20+ + Express
- Prisma + PostgreSQL
- JWT authentication
- Zod (validation)
- Nodemailer (emails)

### Infrastructure
- Docker + docker-compose
- Traefik (reverse proxy, SSL)
- PostgreSQL 16
- GitHub Actions (CI/CD)

## Démarrage Rapide

### Prérequis

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **PostgreSQL** (ou Docker)

### Installation (Mode Hybride - Recommandé)

```bash
# 1. Cloner et installer
git clone <repo-url>
cd pioum
pnpm install

# 2. Lancer PostgreSQL en Docker
docker compose up db

# 3. Configurer le backend
cd packages/backend
cp .env.example .env
# Édite .env avec tes variables (DATABASE_URL, JWT_SECRET, etc.)

# 4. Initialiser la base de données
pnpm db:generate   # Génère le client Prisma
pnpm db:push       # Applique le schéma
pnpm db:seed       # Insère les avatars

# 5. Lancer le backend
pnpm dev          # Démarre sur http://localhost:3000
```

### Dans un autre terminal - Frontend

```bash
cd packages/frontend
cp .env.example .env
pnpm dev          # Démarre sur http://localhost:5173
```

L'app sera disponible sur **http://localhost:5173**

## Configuration

### Variables d'Environnement

#### Backend (`packages/backend/.env`)
```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/pioum"

# JWT
JWT_SECRET="your-secret-key-32-chars-minimum"

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"

# Email Magic Link (optionnel)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Configuration
FRONTEND_URL="http://localhost:5173"
PORT=3000
NODE_ENV="development"
```

#### Frontend (`packages/frontend/.env`)
```env
# API Backend
VITE_API_URL="http://localhost:3000"
```

## Scripts

### À la racine (tous les packages)
```bash
pnpm dev          # Lance backend + frontend en parallèle
pnpm build        # Build production
pnpm lint         # Lint tout le code
pnpm test         # Tests en watch mode
pnpm test:run     # Tests une seule fois (CI mode)
```

### Backend spécifique
```bash
cd packages/backend

pnpm dev          # Serveur avec hot reload
pnpm build        # Build TypeScript
pnpm lint         # Lint le code
pnpm test         # Tests en watch
pnpm test:run     # Tests une seule fois

# Prisma
pnpm db:generate  # Génère le client après modif schema
pnpm db:push      # Applique les changements à la DB
pnpm db:seed      # Insère les données initiales
pnpm db:studio    # UI web pour explorer la DB
```

### Frontend spécifique
```bash
cd packages/frontend

pnpm dev          # Vite dev server
pnpm build        # Build production
pnpm preview      # Preview du build
pnpm lint         # Lint le code
pnpm test         # Tests en watch
pnpm test:run     # Tests une seule fois
```

## API REST

### Authentification
- `POST /api/auth/google` - Connexion via Google
- `POST /api/auth/magic-link` - Demander une magic link
- `POST /api/auth/magic-link/verify` - Vérifier la magic link
- `POST /api/auth/dev-login` - Login dev (dev mode seulement)
- `GET /api/auth/me` - Utilisateur courant
- `GET /api/auth/users` - Récupérer tous les utilisateurs
- `POST /api/auth/logout` - Déconnexion

### Groupes
- `GET /api/groups` - Mes groupes
- `POST /api/groups` - Créer un groupe
- `POST /api/groups/join` - Rejoindre via code
- `GET /api/groups/:id` - Détail d'un groupe
- `PATCH /api/groups/:id` - Modifier (admin)
- `DELETE /api/groups/:id` - Supprimer (admin)
- `DELETE /api/groups/:id/leave` - Quitter un groupe

### Sessions & Récurrences
- `GET /api/sessions/today/:groupId` - Session du jour
- `GET /api/sessions/upcoming/:groupId` - Prochaines sessions (paginé)
- `POST /api/sessions` - Créer une séance ponctuelle
- `PATCH /api/sessions/:id` - Modifier (scope=single|future)
- `DELETE /api/sessions/:id` - Supprimer (scope=single|future|all)
- `POST /api/sessions/:id/join` - Participer
- `DELETE /api/sessions/:id/leave` - Ne plus participer
- `GET /api/groups/:id/recurrence-patterns` - Patterns du groupe
- `POST /api/groups/:id/recurrence-patterns` - Créer un pattern
- `DELETE /api/recurrence-patterns/:id` - Supprimer un pattern

### Voitures
- `POST /api/cars` - Ajouter ma voiture
- `PATCH /api/cars/:id` - Modifier places
- `DELETE /api/cars/:id` - Retirer
- `POST /api/cars/:id/join` - Rejoindre
- `DELETE /api/cars/:id/leave` - Quitter
- `DELETE /api/cars/:id/kick/:userId` - Éjecter un passager

### Bans
- `GET /api/bans/active` - Mes bans actifs
- `GET /api/bans/hall-of-fame` - Statistiques des bans
- `POST /api/bans` - Bannir quelqu'un
- `DELETE /api/bans/:id` - Lever un ban

### Voitures Personnelles
- `GET /api/user-cars` - Mes voitures
- `POST /api/user-cars` - Créer
- `PATCH /api/user-cars/:id` - Modifier
- `DELETE /api/user-cars/:id` - Supprimer

### Avatars & Utilisateurs
- `GET /api/avatars` - Liste des avatars
- `GET /api/users/me` - Mon profil
- `PATCH /api/users/me` - Modifier mon profil

## Déploiement

### Docker (Développement)
```bash
docker compose up --build
```

Accessible sur **http://localhost:5173**

### Production (Self-hosted sur NAS)

```bash
# 1. Préparer la configuration
cp .env.prod.example .env.prod
nano .env.prod

# 2. Lancer en production
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

**Configuration requise dans `.env.prod`:**
```env
DOMAIN=pioum.monnas.com
ACME_EMAIL=ton-email@example.com
JWT_SECRET=<généré avec: openssl rand -hex 32>
DB_PASSWORD=<généré>
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

**Architecture :**
- Internet → Port 443 → Traefik (SSL + routing)
- Traefik gère les certificats Let's Encrypt automatiquement
- Frontend servi par Nginx
- Backend Express.js
- PostgreSQL persistant

## Tests

### Couverture
- **195 tests** au total (61 backend + 134 frontend)
- **100% coverage** sur les modules testés
- Tous les tests passent en **< 2 secondes**

### Exécuter les tests
```bash
# Tous les tests
pnpm test:run

# Avec rapport de coverage
pnpm test:run --coverage

# En watch mode (développement)
pnpm test

# Backend ou Frontend spécifiquement
cd packages/backend && pnpm test:run
cd packages/frontend && pnpm test:run
```

Voir [DOCUMENTATION.md](./DOCUMENTATION.md) pour plus de détails sur les tests et l'architecture.

## Structure du Projet

```
pioum/
├── packages/
│   ├── backend/              # API Express + Prisma
│   │   ├── src/
│   │   │   ├── routes/       # Endpoints REST
│   │   │   ├── middleware/   # Auth, error handling
│   │   │   └── lib/          # Utilities
│   │   ├── prisma/
│   │   │   ├── schema.prisma # Schéma de données
│   │   │   └── seed.ts       # Données initiales
│   │   └── package.json
│   │
│   └── frontend/             # App React
│       ├── src/
│       │   ├── components/   # Composants réutilisables
│       │   ├── pages/        # Vues principales
│       │   ├── stores/       # État global (Zustand)
│       │   └── lib/          # API client, utils
│       ├── public/
│       │   └── avatars/      # Images avatars
│       └── package.json
│
├── .github/workflows/        # GitHub Actions CI/CD
├── docker-compose.yml        # Environnement Docker
├── docker-compose.prod.yml   # Production Docker setup
├── nginx.conf                # Configuration reverse proxy
└── package.json              # Workspace root (pnpm)
```

## CI/CD

GitHub Actions automatise :
- **Linting** de tout le code
- **Tests** (195 tests)
- **Build** production
- **Coverage reporting**

Workflows disponibles : `.github/workflows/`

## Personnalisation des Avatars

Les avatars sont stockés dans `packages/frontend/public/avatars/` par catégorie:
```
public/avatars/
├── users/      # Avatars utilisateurs
├── cars/       # Avatars voitures
└── groups/     # Avatars groupes (emojis)
```

Pour ajouter tes avatars:
1. Place les images dans le sous-dossier approprié
2. Mets à jour le seed dans `packages/backend/prisma/seed.ts`
3. Relance `pnpm db:seed`

## Troubleshooting

### "ECONNREFUSED" sur /api/*
Le frontend ne peut pas joindre le backend.
- Vérifie que le backend tourne sur le port 3000
- En Docker, le proxy doit pointer vers `http://backend:3000`

### "PrismaClientInitializationError"
Client Prisma pas généré ou DB pas accessible.
```bash
pnpm db:generate && pnpm db:push
```

### La DB semble vide
```bash
pnpm db:seed
```

### Reset complet
```bash
docker compose down -v              # Supprime les volumes
rm -rf node_modules packages/*/node_modules
pnpm install
docker compose up db
pnpm db:push && pnpm db:seed
```

Voir [DOCUMENTATION.md](./DOCUMENTATION.md) pour plus de troubleshooting.

## Contribution

1. Crée une branche pour ta feature
2. Applique le style guide du projet
3. Ajoute des tests pour la nouvelle logique
4. Assure-toi que `pnpm lint` et `pnpm test:run` passent
5. Crée une PR

Voir [DOCUMENTATION.md](./DOCUMENTATION.md) pour les guidelines complets.

## Licence

MIT

---

**Questions ?** Consulte [DOCUMENTATION.md](./DOCUMENTATION.md) pour les guides détaillés sur :
- Architecture complète
- Guide de développement
- Tests et coverage
- Workflow CI/CD
