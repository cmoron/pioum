# Guide de Développement Pioum

## Structure du Projet

```
pioum/
├── packages/
│   ├── backend/          # API Express + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src/
│   └── frontend/         # React + Vite
│       └── src/
├── docker-compose.yml    # Environnement Docker complet
├── package.json          # Scripts racine (pnpm workspaces)
└── pnpm-workspace.yaml
```

---

## Modes de Développement

### Option 1 : Hybride (Recommandé) ⭐

**DB en Docker, Backend + Frontend en local**

C'est le mode le plus pratique : hot reload instantané, pas de rebuild.

```bash
# 1. Lancer uniquement PostgreSQL
docker compose up db

# 2. Dans un autre terminal - Backend
cd packages/backend
pnpm install
pnpm db:generate   # Génère le client Prisma
pnpm db:push       # Applique le schema à la DB
pnpm db:seed       # Seed les données (avatars, etc.)
pnpm dev           # Lance le serveur sur localhost:3000

# 3. Dans un autre terminal - Frontend
cd packages/frontend
pnpm install
pnpm dev           # Lance Vite sur localhost:5173
```

**Variables d'environnement backend** (créer `packages/backend/.env`) :
```env
DATABASE_URL="postgresql://pioum:pioum@localhost:5432/pioum?schema=public"
JWT_SECRET="dev-secret-change-in-production"
GOOGLE_CLIENT_ID="ton-client-id"
GOOGLE_CLIENT_SECRET="ton-client-secret"
FRONTEND_URL="http://localhost:5173"
PORT=3000
NODE_ENV=development
```

### Option 2 : Full Docker

Tout dans Docker. Plus lent, utile pour tester l'environnement de prod.

```bash
docker compose up --build
```

⚠️ **Problème connu** : Le proxy Vite dans Docker peut avoir des soucis de résolution réseau. Si `/api` ne fonctionne pas, vérifie que `VITE_API_URL` pointe vers `http://backend:3000` dans docker-compose.yml.

### Option 3 : Full Local

Nécessite PostgreSQL installé localement.

```bash
# Depuis la racine
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev          # Lance backend + frontend en parallèle
```

---

## Workflow Prisma (Base de Données)

### Commandes essentielles

| Commande | Description |
|----------|-------------|
| `pnpm db:generate` | Génère le client Prisma (après modif schema) |
| `pnpm db:push` | Applique le schema à la DB (dev seulement) |
| `pnpm db:seed` | Insère les données initiales (avatars, etc.) |
| `pnpm db:studio` | Interface web pour explorer la DB |

### Quand utiliser quoi ?

```
Modification de schema.prisma
            │
            ▼
    ┌───────────────┐
    │ pnpm db:push  │  ← Applique les changements à la DB
    └───────────────┘
            │
            ▼
  ┌─────────────────────┐
  │ pnpm db:generate    │  ← Regénère les types TypeScript
  └─────────────────────┘
            │
            ▼
    Redémarre le backend (tsx watch le fait auto)
```

### Exemple : Ajouter un champ

```prisma
// schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  xp        Int      @default(0)   // ← Nouveau champ
}
```

```bash
pnpm db:push      # Met à jour la DB
pnpm db:generate  # Regénère les types
# Le backend hot reload automatiquement
```

### Reset complet de la DB

```bash
# Supprime et recrée la DB
docker compose down -v   # Supprime les volumes
docker compose up db     # Recrée la DB vide
pnpm db:push             # Applique le schema
pnpm db:seed             # Remet les données de base
```

---

## Configuration Google OAuth

### 1. Google Cloud Console

1. Créer un projet sur [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Configurer les URIs autorisées :
   - **Origines JavaScript autorisées** : `http://localhost:5173`
   - **URIs de redirection autorisés** : `http://localhost:3000/api/auth/google/callback`

### 2. Variables d'environnement

```env
# Backend (.env)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Frontend (automatiquement via Vite proxy, pas besoin de config)
```

---

## Commandes Utiles

### Depuis la racine

```bash
pnpm dev              # Lance tout en parallèle
pnpm build            # Build prod
pnpm lint             # Lint tout
pnpm test             # Tests tout
```

### Backend spécifique

```bash
cd packages/backend
pnpm dev              # Hot reload avec tsx watch
pnpm test             # Tests Vitest
pnpm db:studio        # UI Prisma (http://localhost:5555)
```

### Frontend spécifique

```bash
cd packages/frontend
pnpm dev              # Vite dev server
pnpm build            # Build prod
pnpm preview          # Preview du build
```

---

## Dev Login (Multi-utilisateurs)

Pour tester avec plusieurs utilisateurs sans passer par Google OAuth :

```bash
# Créer un utilisateur de test
curl -X POST http://localhost:3000/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'
```

Le endpoint retourne un cookie JWT valide. Utilisable uniquement en `NODE_ENV=development`.

---

## Troubleshooting

### "ECONNREFUSED" sur /api/*

**Cause** : Le frontend ne peut pas joindre le backend.

**Solutions** :
1. Vérifie que le backend tourne sur le port 3000
2. En mode hybride, le proxy Vite doit pointer vers `http://localhost:3000`
3. En Docker, le proxy doit pointer vers `http://backend:3000`

### "PrismaClientInitializationError"

**Cause** : Client Prisma pas généré ou DB pas accessible.

```bash
pnpm db:generate
pnpm db:push
```

### Types TypeScript manquants après modif schema

```bash
pnpm db:generate
# Puis redémarre le serveur TS (ou ton IDE)
```

### "Invalid `prisma.xxx.findMany()` invocation"

**Cause** : Le schema Prisma a changé mais le client n'est pas regénéré.

```bash
pnpm db:generate
```

### La DB semble vide (pas d'avatars, etc.)

```bash
pnpm db:seed
```

### Erreur 429 "Too Many Requests"

Le rate limiter est désactivé en mode dev (`NODE_ENV=development`). Si tu vois cette erreur :
1. Vérifie que `NODE_ENV=development` dans `.env` backend
2. Redémarre le backend

### Reset complet (nucléaire ☢️)

```bash
docker compose down -v              # Supprime tout
rm -rf node_modules                 # Clean node_modules racine
rm -rf packages/*/node_modules      # Clean tous les packages
pnpm install                        # Réinstalle
docker compose up db                # Relance DB
pnpm db:push && pnpm db:seed        # Recrée schema + données
```

---

## Workflow Recommandé au Quotidien

```bash
# Terminal 1 - DB
docker compose up db

# Terminal 2 - Backend
cd packages/backend && pnpm dev

# Terminal 3 - Frontend
cd packages/frontend && pnpm dev
```

Ouvre http://localhost:5173 et code ! Les changements sont appliqués instantanément.
