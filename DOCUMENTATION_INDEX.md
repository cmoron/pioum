# Index de la Documentation - Pioum

## Fichiers de Documentation (7 fichiers)

### 1. README.md (372 lignes)
**Point d'entrée principal du projet**

Contenu:
- Fonctionnalités principales
- Stack technique résumée
- Démarrage rapide (installation en 3 modes)
- Configuration variables d'environnement
- Scripts disponibles
- API endpoints résumé
- Déploiement (dev + production)
- Tests overview
- Troubleshooting basique
- Structure du projet

**Taille** : 9.6 KB | **Durée lecture** : 10 min
**Audience** : Tous (utilisateurs, devs, leads)
**Usage** : Page d'accueil, quick reference

---

### 2. DOCUMENTATION.md (699 lignes)
**Hub centralisant toute la documentation détaillée**

Contenu:
- Architecture (vue d'ensemble + diagrammes)
- Monorepo structure
- Modèle de données
- Flux authentification
- Sécurité
- Guide de développement complet
- Workflow Prisma
- Configuration Google OAuth
- Commandes courantes
- Tests (structure, exécution, patterns)
- CI/CD (workflows, statut)
- Troubleshooting exhaustif (10+ scénarios)
- Best practices

**Taille** : 19 KB | **Durée lecture** : 30-60 min (par sections)
**Audience** : Développeurs
**Usage** : Référence principale pour détails
**Replaces** : CI_SETUP.md + README_TESTS.md + TESTING_SUMMARY.md + TEST_COVERAGE_REPORT.md

---

### 3. ARCHITECTURE.md (421 lignes)
**Architecture technique détaillée du projet**

Contenu:
- Diagrammes d'architecture
- Vue d'ensemble système
- Structure du monorepo
- Modèle de données ER complet
- Flux authentification (OAuth + Magic Link)
- Flux temps réel (polling)
- Sécurité
- Déploiement (dev + production)
- Scalabilité et limites
- Tests
- Décisions techniques

**Taille** : 21 KB | **Durée lecture** : 20-30 min
**Audience** : Développeurs, Tech leads
**Usage** : Deep dive architecture, design decisions

---

### 4. DEV_GUIDE.md (285 lignes)
**Guide de développement avec options de setup**

Contenu:
- Prérequis
- Option 1 : Mode Hybride (recommandé)
- Option 2 : Full Docker
- Option 3 : Full Local
- Workflow Prisma (base de données)
- Configuration Google OAuth
- Dev login (multi-utilisateurs)
- Commandes utiles
- Troubleshooting
- Workflow quotidien recommandé

**Taille** : 7 KB | **Durée lecture** : 15 min
**Audience** : Développeurs
**Usage** : Setup local, workflow quotidien

---

### 5. CLAUDE.md (265 lignes)
**Guidelines et philosophie du projet**

Contenu:
- Philosophie (beliefs, values)
- Processus de développement
- Planning & staging
- Implementation flow
- When stuck (max 3 attempts)
- Standards techniques (architecture, code, error handling)
- Decision framework
- Project integration
- Quality gates
- Important reminders
- Agent dispatch protocol

**Taille** : 11 KB | **Durée lecture** : 15 min
**Audience** : Développeurs, Tech leads
**Usage** : Guidelines projet, contributions

---

### 6. PRD.md (139 lignes)
**Product Requirements Document**

Contenu:
- Vision produit
- Contexte & problème
- Utilisateurs cibles
- Fonctionnalités (MVP v1.0)
- Features détaillées (F1-F5)
- Exigences non-fonctionnelles
- Métriques de succès
- Contraintes
- Décisions prises
- Glossaire

**Taille** : 4.3 KB | **Durée lecture** : 10 min
**Audience** : Tous (product, devs)
**Usage** : Spécifications produit, context

---

### 7. DOCUMENTATION_STRUCTURE.md (256 lignes)
**Guide de navigation dans la documentation**

Contenu:
- Arborescence documentaire
- Navigation par cas d'usage
- Information par fichier
- Hiérarchie de l'information
- Clés de référencement
- Maintenance checklist
- Historique versions
- Prochaines évolutions

**Taille** : 8 KB | **Durée lecture** : 10 min
**Audience** : Mainteneurs de documentation
**Usage** : Comprendre structure doc

---

### 8. DOCUMENTATION_INDEX.md (Ce fichier)
**Index et guide des fichiers documentation**

Contenu:
- Listing de tous les fichiers
- Descriptions par fichier
- Cas d'usage courants
- Recommandations de lecture
- Matrice de navigation

**Taille** : ~5 KB | **Durée lecture** : 10 min
**Audience** : Tous
**Usage** : Trouver la bonne documentation

---

## Cas d'Usage & Recommandations

### Je suis un nouveau développeur

**Progression recommandée** (30 minutes total):

1. **Lire** [README.md](./README.md) (10 min)
   - Comprendre le projet
   - Stack technique
   - Fonctionnalités principales

2. **Installer** → Suivre "Démarrage Rapide"
   - Mode Hybride recommandé
   - ~15 min pour être opérationnel

3. **Consulter au besoin**
   - [DEV_GUIDE.md](./DEV_GUIDE.md) pour setup options
   - [DOCUMENTATION.md](./DOCUMENTATION.md) pour détails
   - [CLAUDE.md](./CLAUDE.md) pour guidelines

---

### Je dois corriger un bug

**Parcours recommandé** (selon bug):

1. **Comprendre le contexte**
   - [ARCHITECTURE.md](./ARCHITECTURE.md) pour overview
   - [DOCUMENTATION.md § Architecture](./DOCUMENTATION.md#architecture) pour détails

2. **Localiser le problème**
   - [DOCUMENTATION.md § Troubleshooting](./DOCUMENTATION.md#troubleshooting)
   - Cherche par type d'erreur

3. **Tester la solution**
   - [DOCUMENTATION.md § Tests](./DOCUMENTATION.md#tests)
   - Lance `pnpm test:run`

---

### Je dois ajouter une feature

**Parcours recommandé**:

1. **Lire le context produit**
   - [PRD.md](./PRD.md) pour spécifications

2. **Étudier l'architecture**
   - [ARCHITECTURE.md](./ARCHITECTURE.md) pour modèle complet
   - [DOCUMENTATION.md § Architecture](./DOCUMENTATION.md#architecture)

3. **Comprendre les guidelines**
   - [CLAUDE.md](./CLAUDE.md) pour philosophie et process

4. **Implémenter**
   - Suivre patterns existants
   - Ajouter tests

---

### Je dois déployer en production

**Parcours recommandé**:

1. **Lire le résumé**
   - [README.md § Déploiement](./README.md#déploiement)

2. **Détails si besoin**
   - [DOCUMENTATION.md § Déploiement](./DOCUMENTATION.md#déploiement-production)
   - [ARCHITECTURE.md § Architecture production](./ARCHITECTURE.md#architecture-de-production-self-hosted)

---

### Je dois comprendre les tests

**Parcours recommandé**:

1. **Vue rapide**
   - [README.md § Tests](./README.md#tests)

2. **Détails**
   - [DOCUMENTATION.md § Tests](./DOCUMENTATION.md#tests)
   - Patterns, exécution, coverage

---

### Je dois mettre à jour la documentation

**Parcours recommandé**:

1. **Comprendre la structure**
   - [DOCUMENTATION_STRUCTURE.md](./DOCUMENTATION_STRUCTURE.md)

2. **Consulter checklist**
   - [UPDATES.md § Checklist](./UPDATES.md#checklist-pour-les-mainteneurs)

3. **Mises à jour**
   - Minor : Édite fichier directement
   - Major : Centralise dans DOCUMENTATION.md
   - New : Ajoute dans DOCUMENTATION.md + cross-ref depuis README.md

---

## Matrice de Navigation

| Besoin | Fichier Principal | Secondaire |
|--------|-------------------|-----------|
| Quick start | README.md | DEV_GUIDE.md |
| Setup local | DEV_GUIDE.md | DOCUMENTATION.md |
| Troubleshooting | DOCUMENTATION.md | README.md |
| Architecture | ARCHITECTURE.md | DOCUMENTATION.md |
| Tests | DOCUMENTATION.md | README.md |
| CI/CD | DOCUMENTATION.md | .github/workflows/ |
| Product spec | PRD.md | README.md |
| Guidelines | CLAUDE.md | DOCUMENTATION.md |
| Doc navigation | DOCUMENTATION_STRUCTURE.md | DOCUMENTATION_INDEX.md |

---

## Statistiques Documentation

| Métrique | Valeur |
|----------|--------|
| Fichiers | 8 (index inclus) |
| Duplication | 0% |
| Coverage | 100% |

---

## Maintenance & Mise à Jour

### Checklist Quotidienne
- Aucune action requise

### Checklist Hebdomadaire
- Vérifier que pas de broken links

### Checklist Mensuelle
- Relire troubleshooting pour patterns récents
- Vérifier que versions tools sont correctes

### Checklist Trimestrielle
- Audit complet comme DOCUMENTATION_AUDIT.md
- Vérifier patterns documentés = code réel

### Checklist Annuelle
- Rewrite major sections pour clarté
- Considérer migration vers wiki si trop gros

---

## Fichiers à Connaître

### Documentation Production (Public)
- [README.md](./README.md) - Point d'entrée
- [DOCUMENTATION.md](./DOCUMENTATION.md) - Référence
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technique
- [DEV_GUIDE.md](./DEV_GUIDE.md) - Setup
- [CLAUDE.md](./CLAUDE.md) - Guidelines
- [PRD.md](./PRD.md) - Spec produit

### Metadata Documentation (Interne)
- [DOCUMENTATION_STRUCTURE.md](./DOCUMENTATION_STRUCTURE.md) - Navigation
- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - Ce fichier

### Code Documentation
- [.github/workflows/README.md](./.github/workflows/README.md) - CI/CD

---

## Favoris Recommandés

Pour un accès rapide, marque en favoris:

1. **[README.md](./README.md)** - Quick reference
2. **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Référence complète
3. **[DOCUMENTATION_STRUCTURE.md](./DOCUMENTATION_STRUCTURE.md)** - Navigation

---

**Dernière mise à jour** : 2026-01-29
**Statut** : Documentation complète et organisée
