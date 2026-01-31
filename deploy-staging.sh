#!/bin/bash
# Script utilitaire pour le déploiement et la gestion de Pioum Staging
# Usage: ./deploy-staging.sh [command]

set -e

# Configuration
COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE=".env.staging"
PROJECT_NAME="pioum-staging"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction d'aide
function show_help() {
    cat << EOF
Usage: ./deploy-staging.sh [command]

Commands:
    setup           Configuration initiale (première installation)
    build           Build les images Docker
    start           Démarrer les containers
    stop            Arrêter les containers
    restart         Redémarrer les containers
    logs            Afficher les logs (Ctrl+C pour sortir)
    status          Afficher le statut des containers
    update          Mettre à jour depuis git, rebuild et redémarrer
    migrate         Appliquer les migrations Prisma
    seed            Seed la base de données
    backup          Créer un backup de la base de données
    shell-backend   Ouvrir un shell dans le container backend
    shell-db        Ouvrir psql dans le container database
    health          Vérifier la santé de l'application
    clean           Nettoyer les images et containers inutilisés
    reset           ATTENTION: Reset complet (supprime les données)
    help            Afficher cette aide

Examples:
    ./deploy-staging.sh setup
    ./deploy-staging.sh update
    ./deploy-staging.sh logs backend
    ./deploy-staging.sh health

EOF
}

# Vérifier que le fichier .env existe
function check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}Erreur: $ENV_FILE n'existe pas${NC}"
        echo "Exécutez d'abord: cp .env.staging.example $ENV_FILE"
        echo "Puis éditez $ENV_FILE avec vos configurations"
        exit 1
    fi
}

# Configuration initiale
function setup() {
    echo -e "${GREEN}=== Configuration Initiale ===${NC}"

    if [ ! -f "$ENV_FILE" ]; then
        if [ -f ".env.staging.example" ]; then
            cp .env.staging.example $ENV_FILE
            echo -e "${YELLOW}Fichier $ENV_FILE créé depuis le template${NC}"
            echo -e "${YELLOW}IMPORTANT: Éditez $ENV_FILE et remplissez les variables obligatoires${NC}"
            echo ""
            echo "Variables à configurer:"
            echo "  - STAGING_DOMAIN"
            echo "  - JWT_SECRET (générer avec: openssl rand -hex 32)"
            echo "  - DB_PASSWORD (générer avec: openssl rand -hex 16)"
            echo "  - GOOGLE_CLIENT_ID"
            echo "  - GOOGLE_CLIENT_SECRET"
            echo ""
            echo "Ensuite, exécutez: ./deploy-staging.sh build"
            exit 0
        else
            echo -e "${RED}Erreur: .env.staging.example n'existe pas${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Le fichier $ENV_FILE existe déjà${NC}"
    fi

    echo "Vérification de Docker..."
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker n'est pas installé${NC}"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}docker-compose n'est pas installé${NC}"
        exit 1
    fi

    echo -e "${GREEN}Configuration OK${NC}"
}

# Build des images
function build() {
    check_env
    echo -e "${GREEN}=== Build des images Docker ===${NC}"
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE build "$@"
    echo -e "${GREEN}Build terminé${NC}"
}

# Démarrer les containers
function start() {
    check_env
    echo -e "${GREEN}=== Démarrage des containers ===${NC}"
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d "$@"
    echo -e "${GREEN}Containers démarrés${NC}"
    sleep 3
    status
}

# Arrêter les containers
function stop() {
    echo -e "${YELLOW}=== Arrêt des containers ===${NC}"
    docker-compose -f $COMPOSE_FILE down
    echo -e "${GREEN}Containers arrêtés${NC}"
}

# Redémarrer les containers
function restart() {
    check_env
    echo -e "${YELLOW}=== Redémarrage des containers ===${NC}"
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE restart "$@"
    echo -e "${GREEN}Containers redémarrés${NC}"
}

# Afficher les logs
function logs() {
    docker-compose -f $COMPOSE_FILE logs -f --tail=100 "$@"
}

# Statut des containers
function status() {
    echo -e "${GREEN}=== Statut des containers ===${NC}"
    docker-compose -f $COMPOSE_FILE ps
    echo ""
    echo -e "${GREEN}=== Healthchecks ===${NC}"
    docker ps --filter "name=$PROJECT_NAME" --format "table {{.Names}}\t{{.Status}}"
}

# Mise à jour depuis git
function update() {
    check_env
    echo -e "${GREEN}=== Mise à jour de l'application ===${NC}"

    # Backup avant mise à jour
    echo "Création d'un backup de sécurité..."
    backup

    # Pull git
    echo "Pull des dernières modifications..."
    git pull

    # Rebuild
    echo "Rebuild des images..."
    build --no-cache

    # Redémarrer
    echo "Redémarrage des containers..."
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d

    # Migrations
    echo "Application des migrations..."
    migrate

    echo -e "${GREEN}Mise à jour terminée${NC}"
    status
}

# Appliquer les migrations
function migrate() {
    check_env
    echo -e "${GREEN}=== Application des migrations Prisma ===${NC}"
    docker-compose -f $COMPOSE_FILE exec backend sh -c "npx prisma migrate deploy"
    echo -e "${GREEN}Migrations appliquées${NC}"
}

# Seed la base de données
function seed() {
    check_env
    echo -e "${GREEN}=== Seed de la base de données ===${NC}"
    docker-compose -f $COMPOSE_FILE exec backend sh -c "npm run db:seed"
    echo -e "${GREEN}Seed terminé${NC}"
}

# Backup de la base de données
function backup() {
    check_env

    BACKUP_DIR="./backups"
    mkdir -p $BACKUP_DIR

    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/pioum_staging_${DATE}.sql.gz"

    echo -e "${GREEN}=== Backup de la base de données ===${NC}"

    # Récupérer les variables d'env
    source $ENV_FILE

    # Créer le backup
    docker exec ${PROJECT_NAME}-db pg_dump -U ${DB_USER:-pioum} ${DB_NAME:-pioum_staging} | gzip > "${BACKUP_FILE}"

    echo -e "${GREEN}Backup créé: ${BACKUP_FILE}${NC}"

    # Garder seulement les 7 derniers backups
    find "${BACKUP_DIR}" -name "pioum_staging_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
}

# Shell dans le backend
function shell_backend() {
    echo -e "${GREEN}=== Shell backend (tapez 'exit' pour sortir) ===${NC}"
    docker exec -it ${PROJECT_NAME}-backend sh
}

# Shell dans la DB
function shell_db() {
    check_env
    source $ENV_FILE
    echo -e "${GREEN}=== Shell PostgreSQL (tapez '\q' pour sortir) ===${NC}"
    docker exec -it ${PROJECT_NAME}-db psql -U ${DB_USER:-pioum} ${DB_NAME:-pioum_staging}
}

# Vérifier la santé de l'application
function health() {
    echo -e "${GREEN}=== Vérification de la santé ===${NC}"

    echo "1. Statut des containers:"
    status

    echo ""
    echo "2. Test du backend (localhost):"
    if curl -f http://127.0.0.1:3002/api/health 2>/dev/null; then
        echo -e "${GREEN}✓ Backend OK${NC}"
    else
        echo -e "${RED}✗ Backend KO${NC}"
    fi

    echo ""
    echo "3. Test du frontend (localhost):"
    if curl -f -I http://127.0.0.1:8082/ 2>/dev/null | head -n 1; then
        echo -e "${GREEN}✓ Frontend OK${NC}"
    else
        echo -e "${RED}✗ Frontend KO${NC}"
    fi

    echo ""
    echo "4. Test HTTPS (si configuré):"
    if [ -f "$ENV_FILE" ]; then
        source $ENV_FILE
        if [ -n "$STAGING_DOMAIN" ]; then
            if curl -f -k https://$STAGING_DOMAIN/api/health 2>/dev/null; then
                echo -e "${GREEN}✓ HTTPS OK${NC}"
            else
                echo -e "${RED}✗ HTTPS KO (vérifier nginx et les certificats)${NC}"
            fi
        fi
    fi
}

# Nettoyer les images inutilisées
function clean() {
    echo -e "${YELLOW}=== Nettoyage des images inutilisées ===${NC}"
    docker image prune -f
    echo -e "${GREEN}Nettoyage terminé${NC}"
}

# Reset complet (DANGER)
function reset() {
    echo -e "${RED}=== ATTENTION: Reset complet ===${NC}"
    echo -e "${RED}Cette action va supprimer TOUTES les données (base de données, volumes)${NC}"
    read -p "Êtes-vous sûr? (tapez 'yes' pour confirmer): " confirm

    if [ "$confirm" != "yes" ]; then
        echo "Annulé"
        exit 0
    fi

    echo "Arrêt et suppression des containers et volumes..."
    docker-compose -f $COMPOSE_FILE down -v

    echo "Suppression des images..."
    docker images | grep $PROJECT_NAME | awk '{print $3}' | xargs -r docker rmi -f

    echo -e "${GREEN}Reset terminé${NC}"
    echo "Pour redémarrer: ./deploy-staging.sh build && ./deploy-staging.sh start"
}

# Main
case "${1:-help}" in
    setup)
        setup
        ;;
    build)
        shift
        build "$@"
        ;;
    start)
        shift
        start "$@"
        ;;
    stop)
        stop
        ;;
    restart)
        shift
        restart "$@"
        ;;
    logs)
        shift
        logs "$@"
        ;;
    status)
        status
        ;;
    update)
        update
        ;;
    migrate)
        migrate
        ;;
    seed)
        seed
        ;;
    backup)
        backup
        ;;
    shell-backend)
        shell_backend
        ;;
    shell-db)
        shell_db
        ;;
    health)
        health
        ;;
    clean)
        clean
        ;;
    reset)
        reset
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Commande inconnue: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
