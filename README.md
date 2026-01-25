# Pioum - Covoiturage Muscu

Application de covoiturage pour aller à la muscu avec tes potes.

## Fonctionnalités

- Gestion de groupes avec code d'invitation
- Sessions quotidiennes de covoiturage
- Déclaration des voitures et places disponibles
- Attribution des passagers aux voitures
- Système de ban (1 jour à 2 semaines)
- Hall of Fame des bans
- Authentification OAuth Google + Magic Link
- Avatars personnalisables
- PWA installable sur mobile

## Stack technique

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Auth**: OAuth Google + Magic Link (email)
- **Déploiement**: Docker + docker-compose

## Démarrage rapide (développement)

### Prérequis

- Node.js 20+
- pnpm 9+
- PostgreSQL (ou Docker)

### Installation

```bash
# Cloner le repo
cd pioum

# Installer les dépendances
pnpm install

# Copier les variables d'environnement
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env

# Configurer la base de données dans packages/backend/.env
# DATABASE_URL="postgresql://user:password@localhost:5432/pioum"

# Générer le client Prisma
pnpm db:generate

# Pousser le schéma vers la base de données
pnpm db:push

# Seed des avatars
pnpm db:seed

# Lancer en développement
pnpm dev
```

L'application sera disponible sur:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Déploiement Docker (Développement)

```bash
# Build et lancer tous les services
docker-compose up -d

# L'app sera disponible sur :
# - Frontend: http://localhost:5173
# - Backend:  http://localhost:3000
```

### Variables d'environnement Docker

```env
# .env (à la racine)
JWT_SECRET=your-super-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:5173
```

## Déploiement Production (NAS / Self-hosted)

Pour déployer sur un NAS Debian ou tout autre serveur self-hosted :

```bash
# 1. Copier le fichier d'exemple
cp .env.prod.example .env.prod

# 2. Éditer les variables (obligatoire)
nano .env.prod

# 3. Lancer en production
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Configuration requise

Dans `.env.prod` :

```env
# Domaine pointant vers votre NAS
DOMAIN=pioum.monnas.com

# Email pour les certificats Let's Encrypt
ACME_EMAIL=ton-email@example.com

# Secrets (générer avec: openssl rand -hex 32)
JWT_SECRET=<généré>
DB_PASSWORD=<généré>

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

### Prérequis NAS

1. **Docker** et **docker-compose** installés
2. **Ports 80 et 443** ouverts et redirigés
3. **Nom de domaine** pointant vers l'IP publique (ou DynDNS)

### Architecture production

```
Internet → Port 443 → Traefik (SSL) → Frontend (Nginx)
                                   → Backend (Node.js) → PostgreSQL
```

Traefik gère automatiquement :
- Certificats SSL via Let's Encrypt
- Redirection HTTP → HTTPS
- Routing `/api/*` vers le backend

## Structure du projet

```
pioum/
├── packages/
│   ├── backend/          # API Express + Prisma
│   │   ├── src/
│   │   │   ├── routes/   # Routes API
│   │   │   ├── lib/      # Utilitaires
│   │   │   └── middleware/
│   │   └── prisma/       # Schéma et seeds
│   └── frontend/         # App React
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── stores/   # État Zustand
│       │   └── lib/      # API client
│       └── public/
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── nginx.conf
```

## API Endpoints

### Auth
- `POST /api/auth/google` - Connexion Google
- `POST /api/auth/magic-link` - Demande de magic link
- `POST /api/auth/magic-link/verify` - Vérification magic link
- `GET /api/auth/me` - Utilisateur courant
- `POST /api/auth/logout` - Déconnexion

### Groups
- `GET /api/groups` - Mes groupes
- `POST /api/groups` - Créer un groupe
- `POST /api/groups/join` - Rejoindre via code
- `GET /api/groups/:id` - Détail d'un groupe
- `DELETE /api/groups/:id/leave` - Quitter un groupe

### Sessions
- `GET /api/sessions/today/:groupId` - Session du jour
- `POST /api/sessions/:id/join` - Participer
- `DELETE /api/sessions/:id/leave` - Ne plus participer

### Cars
- `POST /api/cars` - Ajouter ma voiture
- `PATCH /api/cars/:id` - Modifier places
- `DELETE /api/cars/:id` - Retirer ma voiture
- `POST /api/cars/:id/join` - Rejoindre une voiture
- `DELETE /api/cars/:id/leave` - Quitter une voiture
- `DELETE /api/cars/:id/kick/:userId` - Éjecter un passager

### Bans
- `GET /api/bans/active` - Mes bans actifs
- `GET /api/bans/hall-of-fame` - Hall of Fame
- `POST /api/bans` - Bannir quelqu'un
- `DELETE /api/bans/:id` - Lever un ban

### Avatars
- `GET /api/avatars` - Liste des avatars disponibles

## Personnalisation des avatars

Les avatars sont stockés dans `packages/frontend/public/avatars/`. Pour ajouter tes propres avatars:

1. Place tes images SVG/PNG dans `public/avatars/`
2. Mets à jour le seed dans `packages/backend/prisma/seed.ts`
3. Relance `pnpm db:seed`

## Licence

MIT
