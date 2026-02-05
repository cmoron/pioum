# Checklist de Déploiement Staging - Pioum

Version: 1.0
Environnement: Staging
Serveur: Debian avec nginx reverse proxy

---

## Pré-Déploiement

### Prérequis Infrastructure

- [ ] Serveur Debian accessible via SSH
- [ ] Docker installé et fonctionnel (`docker --version`)
- [ ] Docker Compose installé (`docker-compose --version`)
- [ ] Nginx installé et fonctionnel (`nginx -v`)
- [ ] Git installé (`git --version`)
- [ ] Certbot installé pour Let's Encrypt (`certbot --version`)

### Prérequis DNS & Réseau

- [ ] Domaine staging configuré (ex: `staging-pioum.example.com`)
- [ ] DNS pointant vers l'IP du serveur
- [ ] Vérification de la résolution DNS (`dig staging-pioum.example.com`)
- [ ] Firewall configuré (ports 80/443 ouverts)

### Prérequis OAuth & Services Externes

- [ ] Credentials Google OAuth créés pour staging
- [ ] Redirect URI configurée: `https://staging-pioum.example.com/auth/google/callback`
- [ ] (Optionnel) Credentials SMTP pour Magic Link

---

## Phase 1: Préparation

### Clonage du Projet

- [ ] Se connecter au serveur via SSH
- [ ] Créer le répertoire de déploiement (ex: `/home/cyril/deployments`)
- [ ] Cloner le repository:
  ```bash
  git clone <repo-url> pioum-staging
  ```
- [ ] Se placer dans le répertoire: `cd pioum-staging`
- [ ] Checkout de la branche appropriée: `git checkout staging`

### Configuration des Variables d'Environnement

- [ ] Copier le template: `cp .env.staging.example .env.staging`
- [ ] Générer un JWT_SECRET: `openssl rand -hex 32`
- [ ] Générer un DB_PASSWORD: `openssl rand -hex 16`
- [ ] Éditer `.env.staging` et remplir:
  - [ ] `STAGING_DOMAIN`
  - [ ] `JWT_SECRET`
  - [ ] `DB_PASSWORD`
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] (Optionnel) Variables SMTP
- [ ] Vérifier que toutes les variables obligatoires sont définies
- [ ] Sécuriser le fichier: `chmod 600 .env.staging`

---

## Phase 2: Configuration Nginx & SSL

### Configuration Nginx

- [ ] Copier la config:
  ```bash
  sudo cp nginx-host-staging.conf /etc/nginx/sites-available/pioum-staging
  ```
- [ ] Éditer la config et adapter le domaine:
  ```bash
  sudo nano /etc/nginx/sites-available/pioum-staging
  ```
- [ ] Vérifier `server_name` = `STAGING_DOMAIN`
- [ ] Créer le répertoire certbot: `sudo mkdir -p /var/www/certbot`

### Obtention du Certificat SSL

- [ ] Activer temporairement le site (sans SSL):
  ```bash
  sudo ln -s /etc/nginx/sites-available/pioum-staging /etc/nginx/sites-enabled/
  ```
- [ ] Tester la config nginx: `sudo nginx -t`
- [ ] Recharger nginx: `sudo systemctl reload nginx`
- [ ] Obtenir le certificat:
  ```bash
  sudo certbot certonly --webroot \
    -w /var/www/certbot \
    -d staging-pioum.example.com \
    --email votre-email@example.com \
    --agree-tos
  ```
- [ ] Vérifier que le certificat existe:
  ```bash
  sudo ls -la /etc/letsencrypt/live/staging-pioum.example.com/
  ```
- [ ] Vérifier la syntaxe nginx: `sudo nginx -t`
- [ ] Recharger nginx: `sudo systemctl reload nginx`

---

## Phase 3: Build et Démarrage Docker

### Build des Images

- [ ] Rendre le script executable: `chmod +x deploy-staging.sh`
- [ ] Build les images: `./deploy-staging.sh build`
- [ ] Attendre la fin du build (5-10 minutes)
- [ ] Vérifier les images créées: `docker images | grep pioum`

### Lancement des Containers

- [ ] Démarrer la stack: `./deploy-staging.sh start`
- [ ] Vérifier le statut: `./deploy-staging.sh status`
- [ ] Attendre que tous les containers soient "healthy"
- [ ] Vérifier les logs: `./deploy-staging.sh logs`
- [ ] Vérifier qu'il n'y a pas d'erreurs critiques

---

## Phase 4: Initialisation Base de Données

### Migrations Prisma

- [ ] Appliquer les migrations: `./deploy-staging.sh migrate`
- [ ] Vérifier qu'il n'y a pas d'erreurs dans les logs
- [ ] Vérifier la structure de la DB:
  ```bash
  ./deploy-staging.sh shell-db
  \dt
  \q
  ```

### Seed des Données

- [ ] Seed la base de données: `./deploy-staging.sh seed`
- [ ] Vérifier que les avatars sont insérés:
  ```bash
  ./deploy-staging.sh shell-db
  SELECT COUNT(*) FROM "Avatar";
  \q
  ```

---

## Phase 5: Vérifications

### Tests de Santé

- [ ] Vérification complète: `./deploy-staging.sh health`
- [ ] Test backend localhost:
  ```bash
  curl http://127.0.0.1:3001/api/health
  ```
  Attendu: `{"status":"ok"}`
- [ ] Test frontend localhost:
  ```bash
  curl -I http://127.0.0.1:8081/
  ```
  Attendu: `HTTP/1.1 200 OK`
- [ ] Test HTTPS via nginx:
  ```bash
  curl https://staging-pioum.example.com/api/health
  ```
  Attendu: `{"status":"ok"}`

### Vérification des Ports

- [ ] Vérifier que les ports sont sur localhost uniquement:
  ```bash
  sudo netstat -tlnp | grep -E ":(3001|8081)"
  ```
- [ ] S'assurer qu'ils ne sont PAS sur `0.0.0.0`

### Vérification Healthchecks Docker

- [ ] Vérifier le statut de santé:
  ```bash
  docker ps --filter "name=pioum-staging"
  ```
- [ ] Tous les containers doivent afficher "(healthy)"

### Tests Navigateur

- [ ] Ouvrir `https://staging-pioum.example.com` dans un navigateur
- [ ] Vérifier qu'il n'y a pas d'erreur SSL
- [ ] Vérifier que la page se charge correctement
- [ ] Tester la connexion Google OAuth
- [ ] Créer un compte de test
- [ ] Créer un groupe de test
- [ ] Créer une session de test
- [ ] Vérifier que tout fonctionne sans erreurs console

---

## Phase 6: Configuration Post-Déploiement

### Backups Automatiques

- [ ] Créer le répertoire de backups:
  ```bash
  sudo mkdir -p /var/backups/pioum-staging
  sudo chown $USER:$USER /var/backups/pioum-staging
  ```
- [ ] Tester le backup manuel: `./deploy-staging.sh backup`
- [ ] Vérifier que le backup existe: `ls -lh backups/`
- [ ] Configurer un cron job pour backup automatique:
  ```bash
  crontab -e
  # Ajouter:
  0 3 * * * /path/to/pioum-staging/deploy-staging.sh backup >> /var/log/pioum-staging-backup.log 2>&1
  ```
- [ ] Tester le renouvellement automatique SSL:
  ```bash
  sudo certbot renew --dry-run
  ```

### Monitoring

- [ ] Configurer les logs nginx
- [ ] Vérifier que les logs sont écrits:
  ```bash
  sudo tail -f /var/log/nginx/pioum-staging-access.log
  ```
- [ ] (Optionnel) Configurer un système de monitoring (Prometheus, Grafana)
- [ ] (Optionnel) Configurer des alertes

---

## Phase 7: Documentation

### Finalisation

- [ ] Documenter les credentials dans un gestionnaire de mots de passe sécurisé
- [ ] Documenter les procédures spécifiques à votre infrastructure
- [ ] Créer un runbook avec les contacts d'urgence
- [ ] Partager les accès avec l'équipe (si applicable)
- [ ] Planifier les mises à jour régulières

---

## Checklist de Validation Finale

### Fonctionnel

- [ ] Page d'accueil accessible via HTTPS
- [ ] Aucune erreur SSL dans le navigateur
- [ ] Authentification Google OAuth fonctionnelle
- [ ] Création de groupe fonctionnelle
- [ ] Création de session fonctionnelle
- [ ] Inscription à une session fonctionnelle
- [ ] Ajout de voiture fonctionnel
- [ ] API backend répond correctement

### Technique

- [ ] Tous les containers Docker sont "healthy"
- [ ] Aucune erreur dans les logs Docker
- [ ] Aucune erreur dans les logs nginx
- [ ] Ports exposés uniquement sur localhost
- [ ] Firewall configuré correctement
- [ ] Certificat SSL valide et renouvelable
- [ ] Base de données migrée et seedée
- [ ] Backups configurés et testés

### Sécurité

- [ ] `.env.staging` n'est pas dans git
- [ ] `.env.staging` a les permissions 600
- [ ] JWT_SECRET unique pour staging
- [ ] DB_PASSWORD fort et unique
- [ ] Firewall actif (seulement 80/443)
- [ ] OAuth credentials dédiés au staging
- [ ] Nginx headers de sécurité configurés

---

## Rollback si Problème

En cas de problème critique:

1. [ ] Créer un backup d'urgence: `./deploy-staging.sh backup`
2. [ ] Noter l'heure et la nature du problème
3. [ ] Capturer les logs:
   ```bash
   ./deploy-staging.sh logs > /tmp/emergency-logs.txt
   ```
4. [ ] Revenir au commit précédent:
   ```bash
   git checkout <commit-hash>
   ./deploy-staging.sh build
   ./deploy-staging.sh restart
   ```
5. [ ] Restaurer la DB si nécessaire:
   ```bash
   gunzip < backups/pioum_staging_YYYYMMDD_HHMMSS.sql.gz | \
     docker exec -i pioum-staging-db psql -U pioum pioum_staging
   ```

---

## Post-Déploiement

### Communication

- [ ] Notifier l'équipe que le staging est déployé
- [ ] Partager l'URL: `https://staging-pioum.example.com`
- [ ] Partager la documentation de déploiement
- [ ] Planifier une session de test avec l'équipe

### Suivi

- [ ] Monitorer les logs pendant les premières heures
- [ ] Effectuer des tests fonctionnels complets
- [ ] Planifier les mises à jour régulières
- [ ] Planifier la revue de sécurité

---

## Signatures

**Déployé par:** ___________________________
**Date:** ___________________________
**Version:** ___________________________
**Validé par:** ___________________________

---

## Notes

_Espace pour notes additionnelles, problèmes rencontrés, solutions appliquées:_

---

**Déploiement Staging Terminé!**

L'application est accessible sur: `https://staging-pioum.example.com`

Pour support: Voir `DEPLOYMENT_STAGING.md` et `DOCUMENTATION.md`
