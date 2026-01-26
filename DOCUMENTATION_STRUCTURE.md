# Structure de la Documentation - Pioum

Vue d'ensemble de la documentation révisée et consolidée.

## Arborescence de Documentation

```
Pioum Project Documentation
│
├─ README.md ⭐ POINT D'ENTRÉE
│  ├─ Quick Start (3 options)
│  ├─ Stack Technique
│  ├─ Scripts disponibles
│  ├─ API endpoints résumé
│  └─ Troubleshooting basique
│
├─ DOCUMENTATION.md 📚 DOCUMENTATION DÉTAILLÉE
│  ├─ Architecture
│  │  ├─ Vue d'ensemble avec diagrammes
│  │  ├─ Monorepo structure
│  │  ├─ Modèle de données
│  │  ├─ Flux authentification
│  │  └─ Sécurité
│  │
│  ├─ Guide de Développement
│  │  ├─ Installation (3 modes)
│  │  ├─ Configuration (.env)
│  │  ├─ Workflow Prisma
│  │  ├─ Commandes courantes
│  │  ├─ Google OAuth setup
│  │  └─ Dev login multi-users
│  │
│  ├─ Tests
│  │  ├─ Couverture (195 tests)
│  │  ├─ Exécution des tests
│  │  ├─ Patterns de test
│  │  └─ Coverage report
│  │
│  ├─ CI/CD
│  │  ├─ GitHub Actions workflows
│  │  ├─ Pipeline stages
│  │  └─ Statut des builds
│  │
│  └─ Troubleshooting Complet
│     ├─ ECONNREFUSED
│     ├─ Prisma errors
│     ├─ DB vide
│     ├─ Reset complet
│     └─ Autres issues
│
├─ ARCHITECTURE.md 🏗️
│  ├─ Diagrammes détaillés
│  ├─ Modèle ER complet
│  ├─ Flux temps réel
│  └─ Décisions techniques
│
├─ DEV_GUIDE.md 🛠️
│  ├─ Mode Hybride (recommandé)
│  ├─ Mode Full Docker
│  ├─ Mode Full Local
│  └─ Workflow quotidien
│
├─ CLAUDE.md 📋 GUIDELINES DU PROJET
│  ├─ Philosophie
│  ├─ Process de développement
│  ├─ Standards techniques
│  └─ Décisions techniques
│
├─ PRD.md 📊 SPEC PRODUIT
│  ├─ Vision produit
│  ├─ Fonctionnalités
│  ├─ Utilisateurs cibles
│  └─ Glossaire
│
├─ UPDATES.md 📝 (CE FICHIER)
│  └─ Résumé des changements
│
└─ .github/workflows/README.md 🚀
   └─ Documentation CI/CD détaillée
```

## Navigation par Cas d'Usage

### Je suis un nouveau développeur

1. **Lire** [README.md](./README.md) (5 min)
   - Comprendre le projet
   - Voir stack technique

2. **Installer** → Suivre "Démarrage Rapide"
   - Mode Hybride recommandé
   - ~15 min pour être opérationnel

3. **Consulter** [DOCUMENTATION.md § Guide de Développement](./DOCUMENTATION.md#guide-de-développement)
   - Détails des modes de setup
   - Configuration .env
   - Workflow quotidien

4. **Lire** [CLAUDE.md](./CLAUDE.md)
   - Guidelines du projet
   - Comment contribuer

5. **Au fur et à mesure**
   - [ARCHITECTURE.md](./ARCHITECTURE.md) pour détails
   - [DOCUMENTATION.md § Troubleshooting](./DOCUMENTATION.md#troubleshooting) quand tu as un problème

### Je dois corriger un bug

1. **Comprendre** → [ARCHITECTURE.md](./ARCHITECTURE.md) ou [DOCUMENTATION.md § Architecture](./DOCUMENTATION.md#architecture)
2. **Tester** → [DOCUMENTATION.md § Tests](./DOCUMENTATION.md#tests)
3. **Déboguer** → [DOCUMENTATION.md § Troubleshooting](./DOCUMENTATION.md#troubleshooting)
4. **Vérifier** → `pnpm lint` && `pnpm test:run`

### Je dois ajouter une fonctionnalité

1. **Lire** [PRD.md](./PRD.md) pour context produit
2. **Étudier** [ARCHITECTURE.md](./ARCHITECTURE.md) pour modèle de données
3. **Lire** [CLAUDE.md](./CLAUDE.md) pour guidelines
4. **Implémenter** en suivant patterns existants
5. **Tester** → [DOCUMENTATION.md § Tests](./DOCUMENTATION.md#tests)
6. **Documenter** si changements d'API

### Je dois mettre à jour la doc

1. **Identifier** le type de changement
   - Minor update → Édite le fichier concerné directement
   - Major addition → Centralise dans [DOCUMENTATION.md](./DOCUMENTATION.md)
   - New section → Ajoute dans [DOCUMENTATION.md](./DOCUMENTATION.md) + cross-ref depuis [README.md](./README.md)

2. **Vérifier** cohérence
   - Pas de duplication
   - Links valides
   - Exemples testés

3. **Committer**
   ```bash
   git add *.md
   git commit -m "docs: <description courte>"
   ```

### Je dois déployer en production

1. **Lire** [README.md § Déploiement](./README.md#déploiement) (résumé)
2. **Consulter** [DOCUMENTATION.md § Déploiement Production](./DOCUMENTATION.md) si besoin de détails
3. **Suivre** les instructions dans [README.md](./README.md)

### Je dois comprendre les tests

1. **Vue d'ensemble** → [README.md § Tests](./README.md#tests)
2. **Détails** → [DOCUMENTATION.md § Tests](./DOCUMENTATION.md#tests)
3. **Coverage report** → [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md) (référencé dans DOCUMENTATION.md)

### Je dois configurer CI/CD

1. **Voir workflows** → `.github/workflows/`
2. **Comprendre** → [.github/workflows/README.md](./.github/workflows/README.md)
3. **Détails** → [DOCUMENTATION.md § CI/CD](./DOCUMENTATION.md#cicd)

## Information Par Fichier

| Fichier | Publique | Détail | Audience | Mise à Jour |
|---------|----------|--------|----------|-------------|
| **README.md** | ✅ | Quick start | Tous | Souvent |
| **DOCUMENTATION.md** | ✅ | Complet | Devs | Régulièrement |
| **ARCHITECTURE.md** | ✅ | Technique | Devs/Leads | Rarement |
| **DEV_GUIDE.md** | ✅ | Setup | Devs | Occasionnellement |
| **CLAUDE.md** | ✅ | Guidelines | Devs | Rarement |
| **PRD.md** | ✅ | Spec produit | Tous | Rarement |
| **UPDATES.md** | ✅ | Changelog doc | Devs | Une fois |
| **.github/workflows/README.md** | ✅ | CI/CD technique | DevOps | Occasionnellement |

## Hiérarchie de l'Information

### Niveau 1 : Quick Start
**Fichier** : README.md
**Durée** : 5-10 min
**Contenu** : Vue d'ensemble, démarrage rapide, points clés

### Niveau 2 : Détails Opérationnels
**Fichier** : DOCUMENTATION.md
**Durée** : 30-60 min (par sections)
**Contenu** : Comment faire les choses, détails de config, troubleshooting

### Niveau 3 : Deep Dive Technique
**Fichier** : ARCHITECTURE.md, DEV_GUIDE.md, CLAUDE.md
**Durée** : Variable
**Contenu** : Architecture, design decisions, patterns

### Niveau 4 : Spécifications Produit
**Fichier** : PRD.md
**Durée** : Variable
**Contenu** : Features, user stories, glossaire

## Clés de Référencement

Quand tu écris de la documentation:

### Link vers Quick Start
```markdown
Consulte [README.md](./README.md) pour un démarrage rapide.
```

### Link vers Détails
```markdown
Voir [DOCUMENTATION.md § Nom de la Section](./DOCUMENTATION.md#section-name)
```

### Link vers Architecture
```markdown
Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour le diagramme complet.
```

### Link vers Dev Guide
```markdown
Voir [DEV_GUIDE.md](./DEV_GUIDE.md) pour les options de setup.
```

## Maintenance

### Checklist Régulière (Mensuel)

- [ ] Vérifier que les links fonctionnent
- [ ] Vérifier que les code examples sont à jour
- [ ] Vérifier que les versions (Node, pnpm) sont correctes
- [ ] Lire les PRs et mettre à jour la doc si changements

### Quand Fusionner une PR

- [ ] Y-a-t-il des changements d'API ? → Mettre à jour README.md + DOCUMENTATION.md
- [ ] Y-a-t-il des changements d'architecture ? → Mettre à jour ARCHITECTURE.md
- [ ] Y-a-t-il de nouveaux patterns ? → Ajouter à DOCUMENTATION.md § Best Practices
- [ ] Commit messages bons ? → Aucun problème à merger

### Quand Créer une PR

- [ ] Lancer `pnpm lint && pnpm test:run`
- [ ] Si tu ajoutes une feature, ajoute des tests
- [ ] Si tu changes l'API, mets à jour la doc

## Historique de la Documentation

### Version 1.0 (2026-01-26)
- Consolidation complète de la documentation
- Suppression des 5 fichiers redondants
- Création de DOCUMENTATION.md comme hub central
- Mise à jour du README.md pour plus de clarté
- Création de UPDATES.md et DOCUMENTATION_STRUCTURE.md

### Prochaines Versions Potentielles
- 1.1 : API documentation (Swagger/OpenAPI)
- 1.2 : Video guides
- 2.0 : Wiki externe ou Confluence

---

**Statut** : Documentation v1.0 - Complète et organisée ✅
