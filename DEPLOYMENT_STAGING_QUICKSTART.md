# Guide de Déploiement Rapide - Staging

Guide condensé pour un déploiement rapide de Pioum en staging. Pour la version détaillée, voir `DEPLOYMENT_STAGING.md`.

## Prérequis

- Serveur Debian avec Docker et docker-compose installés
- Nginx configuré et fonctionnel sur l'hôte
- Nom de domaine pointant vers le serveur (ex: `stage.pioum.ovh`)
- Accès SSH au serveur

---

## Déploiement en 5 Étapes

### Étape 1: Cloner le Projet

```bash
# Sur le serveur
cd /home/cyril/src  # ou votre dossier de déploiement
git clone https://github.com/votre-org/pioum.git pioum-staging
cd pioum-staging
git checkout staging  # ou main
```

### Étape 2: Configurer les Variables d'Environnement

```bash
# Copier le template
cp .env.staging.example .env.staging

# Éditer les variables obligatoires
nano .env.staging
```

**Variables obligatoires à remplir:**

```env
STAGING_DOMAIN=stage.pioum.ovh
JWT_SECRET=<générer avec: openssl rand -hex 32>
DB_PASSWORD=<générer avec: openssl rand -hex 16>
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-votre-secret
```

### Étape 3: Configurer Nginx et SSL

```bash
# Copier la config nginx
sudo cp nginx-host-staging.conf /etc/nginx/sites-available/pioum-staging

# Adapter le domaine si nécessaire
sudo nano /etc/nginx/sites-available/pioum-staging

# Obtenir un certificat SSL
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d stage.pioum.ovh \
  --email votre-email@example.com \
  --agree-tos

# Activer le site
sudo ln -s /etc/nginx/sites-available/pioum-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Étape 4: Build et Démarrage

```bash
# Utiliser le script utilitaire
./deploy-staging.sh build
./deploy-staging.sh start

# Vérifier le statut
./deploy-staging.sh status
```

### Étape 5: Initialiser la Base de Données

```bash
# Appliquer les migrations
./deploy-staging.sh migrate

# Seed les avatars
./deploy-staging.sh seed

# Vérifier la santé
./deploy-staging.sh health
```

---

## Vérification Finale

```bash
# Test complet
curl https://stage.pioum.ovh/api/health

# Ouvrir dans un navigateur
# https://stage.pioum.ovh
```

---

## Commandes Utiles

### Gestion Quotidienne

```bash
# Voir les logs
./deploy-staging.sh logs          # Tous les services
./deploy-staging.sh logs backend  # Backend uniquement

# Redémarrer
./deploy-staging.sh restart

# Vérifier le statut
./deploy-staging.sh status
```

### Mise à Jour de l'Application

```bash
# Mise à jour complète (git pull + rebuild + restart + migrate)
./deploy-staging.sh update
```

### Backup

```bash
# Créer un backup manuel
./deploy-staging.sh backup

# Les backups sont dans ./backups/
ls -lh backups/
```

### Débogage

```bash
# Shell dans le backend
./deploy-staging.sh shell-backend

# Shell PostgreSQL
./deploy-staging.sh shell-db

# Vérification complète de santé
./deploy-staging.sh health
```

---

## Troubleshooting Rapide

### 502 Bad Gateway

```bash
# Vérifier que les containers sont running
docker ps | grep pioum-staging

# Vérifier les logs nginx
sudo tail -50 /var/log/nginx/pioum-staging-error.log

# Redémarrer les services
./deploy-staging.sh restart
```

### Base de données inaccessible

```bash
# Vérifier les logs
./deploy-staging.sh logs db

# Redémarrer la DB
docker-compose -f docker-compose.staging.yml restart db
```

### OAuth Google ne fonctionne pas

1. Vérifier les Redirect URIs dans Google Cloud Console:
   - `https://stage.pioum.ovh/auth/google/callback`
2. Vérifier `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `.env.staging`
3. Vérifier les logs backend:
   ```bash
   ./deploy-staging.sh logs backend | grep -i oauth
   ```

---

## Architecture du Déploiement

```
Internet (HTTPS 443)
      ↓
Nginx Hôte (SSL/TLS)
      ↓
      ├─→ /api    → 127.0.0.1:3002 (Backend)
      └─→ /       → 127.0.0.1:8082 (Frontend)

Docker Stack:
  - Frontend (Nginx): Port 80 → 127.0.0.1:8082
  - Backend (Express): Port 3000 → 127.0.0.1:3002
  - PostgreSQL: Interne uniquement
```

**Points clés:**
- SSL géré par nginx hôte
- Containers exposés sur localhost uniquement
- Base de données non exposée

---

## Sécurité

```bash
# Restreindre l'accès au fichier .env
chmod 600 .env.staging

# Configurer le firewall (uniquement HTTP/HTTPS)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Support

- Guide détaillé: `DEPLOYMENT_STAGING.md`
- Documentation complète: `DOCUMENTATION.md`
- Architecture: `ARCHITECTURE.md`

---

## Checklist de Déploiement

- [ ] DNS configuré
- [ ] Certificat SSL obtenu
- [ ] Variables d'environnement configurées
- [ ] Containers running et healthy
- [ ] Base de données migrée et seedée
- [ ] Test HTTPS réussi
- [ ] OAuth Google fonctionnel
- [ ] Backup automatique configuré

**Déploiement terminé!** L'application est accessible sur `https://stage.pioum.ovh`
