# Guide de Déploiement - Environnement Staging

Ce guide décrit la procédure complète pour déployer Pioum en environnement staging sur un serveur Debian avec nginx reverse proxy existant.

## Architecture du Déploiement Staging

```
Internet (HTTPS)
      |
      v
┌─────────────────────────────────────────┐
│  Serveur Debian (Hôte)                  │
│                                          │
│  ┌────────────────────────────────┐     │
│  │  Nginx Reverse Proxy           │     │
│  │  - Port 443 (HTTPS)            │     │
│  │  - Gestion SSL/TLS             │     │
│  │  - Certificats Let's Encrypt   │     │
│  └─────────┬──────────────────────┘     │
│            │                             │
│            ├─ /api → 127.0.0.1:3002    │
│            └─ /    → 127.0.0.1:8082    │
│                                          │
│  ┌────────────────────────────────┐     │
│  │  Docker Compose Stack          │     │
│  │                                 │     │
│  │  ┌──────────────────────┐      │     │
│  │  │  Frontend (Nginx)    │      │     │
│  │  │  Port: 80 → 8082     │      │     │
│  │  │  (localhost only)    │      │     │
│  │  └──────────────────────┘      │     │
│  │                                 │     │
│  │  ┌──────────────────────┐      │     │
│  │  │  Backend (Express)   │      │     │
│  │  │  Port: 3000 → 3002   │      │     │
│  │  │  (localhost only)    │      │     │
│  │  └──────────────────────┘      │     │
│  │                                 │     │
│  │  ┌──────────────────────┐      │     │
│  │  │  PostgreSQL 16       │      │     │
│  │  │  (internal only)     │      │     │
│  │  └──────────────────────┘      │     │
│  │                                 │     │
│  └─────────────────────────────────┘     │
│                                          │
└──────────────────────────────────────────┘
```

**Points clés:**
- Le SSL/TLS est géré par le nginx hôte, pas par les containers
- Les containers exposent leurs ports uniquement sur 127.0.0.1 (localhost)
- PostgreSQL n'est accessible que depuis le réseau Docker interne
- Le nginx hôte fait le proxy vers les containers via localhost

---

## Prérequis sur le Serveur

### 1. Software Requis

```bash
# Vérifier les versions
docker --version          # Docker 24.0+
docker-compose --version  # Docker Compose 2.x
nginx -v                  # Nginx 1.18+
git --version            # Git 2.x
```

### 2. Installation si Nécessaire

```bash
# Installer Docker (si absent)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Installer Docker Compose (si absent)
sudo apt update
sudo apt install docker-compose-plugin

# Vérifier nginx
sudo systemctl status nginx
```

### 3. Configuration DNS

Assurez-vous que votre domaine staging pointe vers l'IP du serveur:

```bash
# Tester la résolution DNS
dig stage.pioum.ovh

# Doit retourner l'IP de votre serveur
```

---

## Étape 1: Préparation de l'Environnement

### 1.1. Cloner le Projet

```bash
# Se placer dans le répertoire de déploiement
cd /home/cyril/src  # ou votre dossier préféré

# Cloner le repo
git clone https://github.com/votre-org/pioum.git pioum-staging
cd pioum-staging

# Checkout de la branche staging (ou main selon votre workflow)
git checkout staging  # ou main
```

### 1.2. Configuration des Variables d'Environnement

```bash
# Copier le template staging
cp .env.staging.example .env.staging

# Éditer le fichier
nano .env.staging
```

**Variables à configurer obligatoirement:**

```env
# Domaine staging (SANS https://)
STAGING_DOMAIN=stage.pioum.ovh

# Générer un secret JWT unique pour staging
# IMPORTANT: Doit être différent de la production
JWT_SECRET=<générer avec: openssl rand -hex 32>

# Mot de passe PostgreSQL
DB_PASSWORD=<générer avec: openssl rand -hex 16>

# Google OAuth (créer des credentials dédiés au staging)
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-votre-secret
```

**Configuration Google OAuth:**
1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un OAuth 2.0 Client ID pour staging
3. Authorized redirect URIs:
   - `https://stage.pioum.ovh/auth/google/callback`
   - `https://stage.pioum.ovh`

**Variables optionnelles:**

```env
# SMTP pour Magic Link (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password
SMTP_FROM=noreply@stage.pioum.ovh

# Database (valeurs par défaut OK)
DB_USER=pioum
DB_NAME=pioum_staging
```

### 1.3. Vérifier la Configuration

```bash
# Vérifier que toutes les variables obligatoires sont définies
grep -E "^(STAGING_DOMAIN|JWT_SECRET|DB_PASSWORD)=" .env.staging
```

---

## Étape 2: Configuration du Reverse Proxy Nginx

### 2.1. Créer la Configuration Nginx

```bash
# Copier le template de configuration nginx
sudo cp nginx-host-staging.conf /etc/nginx/sites-available/pioum-staging

# Éditer pour adapter le domaine si nécessaire
sudo nano /etc/nginx/sites-available/pioum-staging
```

**Points à vérifier dans le fichier:**
- `server_name` correspond à votre `STAGING_DOMAIN`
- Les chemins des certificats SSL sont corrects
- Les ports de proxy (`127.0.0.1:3002` et `127.0.0.1:8082`) sont corrects

### 2.2. Obtenir un Certificat SSL (Let's Encrypt)

```bash
# Installer certbot si nécessaire
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Créer le répertoire pour ACME challenge
sudo mkdir -p /var/www/certbot

# Activer temporairement le site sans HTTPS
sudo ln -s /etc/nginx/sites-available/pioum-staging /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger nginx
sudo systemctl reload nginx

# Obtenir le certificat
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d stage.pioum.ovh \
  --email votre-email@example.com \
  --agree-tos \
  --no-eff-email

# Vérifier que le certificat a été créé
sudo ls -la /etc/letsencrypt/live/stage.pioum.ovh/
```

### 2.3. Activer la Configuration HTTPS Complète

```bash
# Éditer la config pour décommenter les lignes SSL
sudo nano /etc/nginx/sites-available/pioum-staging

# Vérifier la syntaxe
sudo nginx -t

# Recharger nginx
sudo systemctl reload nginx
```

### 2.4. Configuration du Renouvellement Automatique

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Certbot installe automatiquement un cron job
# Vérifier: sudo systemctl status certbot.timer
```

---

## Étape 3: Build et Lancement des Containers

### 3.1. Build des Images Docker

```bash
# Se placer dans le répertoire du projet
cd /home/cyril/src/pioum-staging

# Build des images (peut prendre 5-10 minutes)
docker-compose -f docker-compose.staging.yml --env-file .env.staging build

# Vérifier les images créées
docker images | grep pioum
```

### 3.2. Lancer la Stack

```bash
# Lancer les containers en mode détaché
docker-compose -f docker-compose.staging.yml --env-file .env.staging up -d

# Vérifier que tous les containers sont running
docker-compose -f docker-compose.staging.yml ps

# Attendu:
# pioum-staging-db        running (healthy)
# pioum-staging-backend   running (healthy)
# pioum-staging-frontend  running (healthy)
```

### 3.3. Vérifier les Logs

```bash
# Logs de tous les services
docker-compose -f docker-compose.staging.yml logs -f

# Logs d'un service spécifique
docker-compose -f docker-compose.staging.yml logs -f backend
docker-compose -f docker-compose.staging.yml logs -f frontend
docker-compose -f docker-compose.staging.yml logs -f db

# Sortir avec Ctrl+C
```

---

## Étape 4: Initialisation de la Base de Données

### 4.1. Appliquer les Migrations Prisma

```bash
# Accéder au container backend
docker exec -it pioum-staging-backend sh

# À l'intérieur du container:
# Vérifier que Prisma est disponible
cd /app
ls -la node_modules/.bin/prisma

# Appliquer les migrations (génère le schéma DB)
npx prisma migrate deploy

# Si erreur "command not found", utiliser:
node node_modules/.bin/prisma migrate deploy

# Sortir du container
exit
```

**Alternative via docker-compose exec:**

```bash
# Depuis l'hôte
docker-compose -f docker-compose.staging.yml exec backend sh -c "npx prisma migrate deploy"
```

### 4.2. Seed les Données Initiales (Avatars)

```bash
# Seed la base de données
docker-compose -f docker-compose.staging.yml exec backend sh -c "npx prisma db seed"

# Vérifier que les avatars ont été insérés
docker-compose -f docker-compose.staging.yml exec backend sh -c "npx prisma studio"
# Ouvrir http://localhost:5555 dans un navigateur (si tunnel SSH configuré)
```

**Note:** Si `prisma db seed` ne fonctionne pas, vérifier que le script seed est défini dans `packages/backend/package.json`:

```json
"prisma": {
  "seed": "node prisma/seed.js"
}
```

---

## Étape 5: Vérification du Déploiement

### 5.1. Tests de Santé

```bash
# Test du backend via curl
curl http://127.0.0.1:3002/api/health
# Attendu: {"status":"ok"}

# Test du frontend
curl -I http://127.0.0.1:8082/
# Attendu: HTTP/1.1 200 OK

# Test via le reverse proxy nginx (HTTPS)
curl -k https://stage.pioum.ovh/api/health
# Attendu: {"status":"ok"}

# Test complet du frontend
curl -I https://stage.pioum.ovh/
# Attendu: HTTP/2 200
```

### 5.2. Vérifier les Ports

```bash
# Vérifier que les ports sont bien exposés sur localhost uniquement
sudo netstat -tlnp | grep -E ":(3002|8082)"

# Attendu:
# tcp  0  0  127.0.0.1:3002  0.0.0.0:*  LISTEN  <pid>/docker-proxy
# tcp  0  0  127.0.0.1:8082  0.0.0.0:*  LISTEN  <pid>/docker-proxy

# S'assurer qu'ils ne sont PAS exposés sur 0.0.0.0
```

### 5.3. Test dans un Navigateur

1. Ouvrir `https://stage.pioum.ovh`
2. Vérifier que la page se charge sans erreur SSL
3. Tester la connexion Google OAuth
4. Créer un groupe de test
5. Vérifier les logs backend pour les requêtes:
   ```bash
   docker-compose -f docker-compose.staging.yml logs -f backend
   ```

### 5.4. Vérifier les Healthchecks Docker

```bash
# Vérifier le statut de santé des containers
docker ps --filter "name=pioum-staging" --format "table {{.Names}}\t{{.Status}}"

# Tous doivent afficher "(healthy)"
```

---

## Étape 6: Configuration des Sauvegardes

### 6.1. Script de Backup PostgreSQL

Créer un script de backup automatique:

```bash
# Créer le répertoire de backups
sudo mkdir -p /var/backups/pioum-staging
sudo chown $USER:$USER /var/backups/pioum-staging

# Créer le script de backup
cat > /home/cyril/src/pioum-staging/backup-db.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/pioum-staging"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/pioum_staging_${DATE}.sql.gz"

# Récupérer les variables d'environnement
source /home/cyril/src/pioum-staging/.env.staging

# Créer le backup
docker exec pioum-staging-db pg_dump -U ${DB_USER:-pioum} ${DB_NAME:-pioum_staging} | gzip > "${BACKUP_FILE}"

# Garder seulement les 7 derniers backups
find "${BACKUP_DIR}" -name "pioum_staging_*.sql.gz" -mtime +7 -delete

echo "Backup créé: ${BACKUP_FILE}"
EOF

# Rendre le script exécutable
chmod +x /home/cyril/src/pioum-staging/backup-db.sh

# Tester le script
./backup-db.sh
```

### 6.2. Configurer un Cron Job

```bash
# Éditer la crontab
crontab -e

# Ajouter une ligne pour backup quotidien à 3h du matin
0 3 * * * /home/cyril/src/pioum-staging/backup-db.sh >> /var/log/pioum-staging-backup.log 2>&1
```

### 6.3. Test de Restauration

```bash
# Lister les backups
ls -lh /var/backups/pioum-staging/

# Tester la restauration (sur un environnement de test)
gunzip < /var/backups/pioum-staging/pioum_staging_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i pioum-staging-db psql -U pioum pioum_staging
```

---

## Opérations de Maintenance

### Mise à Jour du Code

```bash
cd /home/cyril/src/pioum-staging

# Sauvegarder la base de données avant mise à jour
./backup-db.sh

# Pull les dernières modifications
git pull origin staging

# Rebuild et redéployer
docker-compose -f docker-compose.staging.yml --env-file .env.staging build
docker-compose -f docker-compose.staging.yml --env-file .env.staging up -d

# Appliquer les migrations si nécessaire
docker-compose -f docker-compose.staging.yml exec backend sh -c "npx prisma migrate deploy"

# Vérifier les logs
docker-compose -f docker-compose.staging.yml logs -f
```

### Redémarrer les Services

```bash
# Redémarrer tous les containers
docker-compose -f docker-compose.staging.yml restart

# Redémarrer un container spécifique
docker-compose -f docker-compose.staging.yml restart backend

# Redémarrer nginx
sudo systemctl restart nginx
```

### Arrêter les Services

```bash
# Arrêter sans supprimer les volumes (données préservées)
docker-compose -f docker-compose.staging.yml down

# Arrêter et supprimer les volumes (ATTENTION: perte de données)
docker-compose -f docker-compose.staging.yml down -v
```

### Voir l'Utilisation des Ressources

```bash
# Stats en temps réel
docker stats pioum-staging-backend pioum-staging-frontend pioum-staging-db

# Espace disque utilisé
docker system df

# Taille des volumes
docker volume ls
docker volume inspect pioum-staging_postgres_staging_data
```

### Nettoyer les Images Inutilisées

```bash
# Nettoyer les images non utilisées
docker image prune -a

# Nettoyer tout (images, containers, volumes non utilisés)
docker system prune -a --volumes
```

---

## Monitoring et Logs

### Logs en Temps Réel

```bash
# Tous les services
docker-compose -f docker-compose.staging.yml logs -f --tail=100

# Backend uniquement
docker-compose -f docker-compose.staging.yml logs -f backend --tail=100

# Filtrer par mot-clé
docker-compose -f docker-compose.staging.yml logs -f backend | grep ERROR
```

### Logs Nginx

```bash
# Access logs
sudo tail -f /var/log/nginx/pioum-staging-access.log

# Error logs
sudo tail -f /var/log/nginx/pioum-staging-error.log

# Analyser le trafic
sudo cat /var/log/nginx/pioum-staging-access.log | grep -v "health" | tail -100
```

### Monitoring de la Base de Données

```bash
# Connexion à la DB
docker exec -it pioum-staging-db psql -U pioum pioum_staging

# Requêtes SQL utiles:
# Nombre d'utilisateurs
SELECT COUNT(*) FROM "User";

# Nombre de groupes
SELECT COUNT(*) FROM "Group";

# Nombre de sessions
SELECT COUNT(*) FROM "Session";

# Sessions actives aujourd'hui
SELECT * FROM "Session" WHERE "startAt"::date = CURRENT_DATE;

# Quitter
\q
```

---

## Rollback en Cas de Problème

### Rollback Code

```bash
cd /home/cyril/src/pioum-staging

# Voir l'historique git
git log --oneline -10

# Revenir au commit précédent
git checkout <commit-hash>

# Rebuild et redéployer
docker-compose -f docker-compose.staging.yml --env-file .env.staging build
docker-compose -f docker-compose.staging.yml --env-file .env.staging up -d
```

### Rollback Base de Données

```bash
# Restaurer depuis un backup
gunzip < /var/backups/pioum-staging/pioum_staging_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i pioum-staging-db psql -U pioum pioum_staging
```

---

## Troubleshooting

### Problème: Les containers ne démarrent pas

```bash
# Vérifier les logs
docker-compose -f docker-compose.staging.yml logs

# Vérifier l'état
docker-compose -f docker-compose.staging.yml ps

# Rebuild complet
docker-compose -f docker-compose.staging.yml down
docker-compose -f docker-compose.staging.yml build --no-cache
docker-compose -f docker-compose.staging.yml up -d
```

### Problème: "502 Bad Gateway" de nginx

```bash
# Vérifier que les containers backend/frontend sont running
docker ps | grep pioum-staging

# Vérifier que les ports sont exposés
sudo netstat -tlnp | grep -E ":(3002|8082)"

# Tester directement les containers
curl http://127.0.0.1:3002/api/health
curl -I http://127.0.0.1:8082/

# Vérifier les logs nginx
sudo tail -50 /var/log/nginx/pioum-staging-error.log

# Vérifier la config nginx
sudo nginx -t

# Recharger nginx
sudo systemctl reload nginx
```

### Problème: Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL est running
docker ps | grep pioum-staging-db

# Vérifier les logs de la DB
docker logs pioum-staging-db

# Tester la connexion depuis le backend
docker exec pioum-staging-backend sh -c "nc -zv db 5432"

# Vérifier les variables d'environnement
docker exec pioum-staging-backend env | grep DATABASE_URL
```

### Problème: "Prisma Client not found"

```bash
# Régénérer le client Prisma
docker exec pioum-staging-backend sh -c "npx prisma generate"

# Redémarrer le backend
docker-compose -f docker-compose.staging.yml restart backend
```

### Problème: OAuth Google ne fonctionne pas

**Vérifications:**
1. Le `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont corrects dans `.env.staging`
2. Les Redirect URIs dans Google Cloud Console incluent:
   - `https://stage.pioum.ovh/auth/google/callback`
3. Le `FRONTEND_URL` dans le backend est bien `https://stage.pioum.ovh`
4. Vérifier les logs backend:
   ```bash
   docker-compose -f docker-compose.staging.yml logs -f backend | grep -i oauth
   ```

---

## Checklist de Déploiement

Avant de déclarer le déploiement terminé:

- [ ] DNS configuré et résolu correctement
- [ ] Certificat SSL obtenu et valide
- [ ] Nginx configuré et fonctionnel
- [ ] Containers running et healthy
- [ ] Base de données migrée et seedée
- [ ] Test de connexion HTTPS réussi
- [ ] OAuth Google fonctionnel
- [ ] Healthchecks backend/frontend OK
- [ ] Logs sans erreurs critiques
- [ ] Backup automatique configuré
- [ ] Documentation mise à jour

---

## Sécurité

### Recommandations

1. **Firewall:** N'exposer que les ports 80 et 443
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **Secrets:** Ne jamais commiter `.env.staging` dans git
   ```bash
   # S'assurer que .env.staging est dans .gitignore
   grep ".env.staging" .gitignore
   ```

3. **Permissions:** Restreindre l'accès aux fichiers sensibles
   ```bash
   chmod 600 .env.staging
   ```

4. **Updates:** Maintenir Docker et nginx à jour
   ```bash
   sudo apt update && sudo apt upgrade
   ```

5. **Monitoring:** Configurer des alertes pour les erreurs critiques

---

## Support et Contact

Pour toute question ou problème:
- Documentation complète: `DOCUMENTATION.md`
- Architecture: `ARCHITECTURE.md`
- Issues GitHub: [créer une issue](https://github.com/votre-org/pioum/issues)

---

**Déploiement Staging Réussi!** L'application devrait maintenant être accessible sur `https://stage.pioum.ovh`
