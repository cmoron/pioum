# Session Scheduling - Implementation Plan

## Overview

Cette fonctionnalité ajoute un système de planification de séances avec récurrence, verrouillage des inscriptions, et historique. Elle remplace le modèle actuel "une session implicite par jour" par un calendrier explicite avec créneaux horaires.

### Décisions de design

| Décision | Choix |
|----------|-------|
| Modification récurrence | Choix utilisateur : "Cette séance" ou "Toutes les futures" |
| Permissions récurrence | Tous les membres peuvent créer des patterns |
| UX Mobile | Vue liste par défaut, calendrier semaine en option |
| Auto-join | Reporté (phase ultérieure) |
| Timezone | Europe/Paris par défaut sur les groupes |
| Verrouillage | À l'heure de début (configurable via `registrationLockMinutes`) |

### Architecture

```
RecurrencePattern (template)
    │
    ├── génère instances (job quotidien, fenêtre 90 jours)
    │
    ▼
Session (instance matérialisée)
    │
    ├── startTime, endTime, status (planned/completed/cancelled)
    ├── recurrencePatternId? (null si one-off ou détachée)
    ├── isException (true si modifiée individuellement)
    │
    ▼
Car + Passenger (existants, inchangés)
```

---

## Stage 1: Schema Migration & Time-Based Sessions

**Goal**: Migrer le schéma pour supporter les horaires et préparer la base pour les récurrences.

**Success Criteria**:
- Les sessions ont `startTime` et `endTime` (DateTime)
- Les sessions existantes sont migrées (startTime = date 00:00, endTime = date 23:59)
- L'API `GET /sessions/today/:groupId` continue de fonctionner
- Le frontend affiche les horaires des sessions

**Tests**:
- [ ] Migration réversible (up/down)
- [ ] API sessions retourne startTime/endTime
- [ ] Sessions existantes correctement migrées
- [ ] Frontend affiche les horaires

**Tasks**:
1. [ ] Créer migration Prisma : ajouter `startTime`, `endTime` à Session
2. [ ] Script de migration des données existantes
3. [ ] Mettre à jour les types TypeScript (backend + frontend)
4. [ ] Adapter l'API sessions pour inclure les horaires
5. [ ] Adapter le frontend pour afficher startTime/endTime

**Status**: Complete

---

## Stage 2: Registration Lock Mechanism

**Goal**: Empêcher les inscriptions après le début de la séance.

**Success Criteria**:
- Un utilisateur ne peut pas rejoindre une session dont `startTime` est passé
- Un utilisateur ne peut pas ajouter sa voiture après `startTime`
- Les admins peuvent toujours modifier (override)
- L'UI affiche clairement l'état verrouillé

**Tests**:
- [ ] API rejette join/addCar si session commencée (401/403)
- [ ] API autorise leave même si session commencée
- [ ] Admin peut modifier une session verrouillée
- [ ] Frontend affiche "Inscriptions fermées" + icône cadenas

**Tasks**:
1. [ ] Ajouter middleware `checkSessionLock` sur les routes concernées
2. [ ] Modifier `POST /sessions/:id/join` pour vérifier le verrouillage
3. [ ] Modifier `POST /cars` pour vérifier le verrouillage
4. [ ] Ajouter endpoint `GET /sessions/:id/lock-status`
5. [ ] Mettre à jour le frontend avec indicateur de verrouillage
6. [ ] Permettre bypass admin (vérifier rôle dans middleware)

**Status**: Complete

---

## Stage 3: Create One-Off Session UI

**Goal**: Permettre de créer une séance ponctuelle avec date et horaires.

**Success Criteria**:
- Un utilisateur peut créer une séance pour une date future
- Il peut définir les horaires de début et fin
- La séance créée apparaît dans la liste
- Validation : date future, endTime > startTime

**Tests**:
- [ ] API `POST /sessions` crée une séance avec horaires
- [ ] Validation des horaires (endTime > startTime)
- [ ] UI permet de sélectionner date et horaires
- [ ] Nouvelle séance visible après création

**Tasks**:
1. [ ] Créer composant `CreateSessionModal` avec formulaire
2. [ ] Ajouter date picker et time pickers
3. [ ] Intégrer avec l'API existante `POST /sessions`
4. [ ] Ajouter bouton "Nouvelle séance" dans GroupPage
5. [ ] Validation côté client
6. [ ] Afficher feedback de succès/erreur

**Status**: Complete

---

## Stage 4: Recurrence Pattern Model

**Goal**: Permettre de définir des séances récurrentes (template).

**Success Criteria**:
- Un utilisateur peut créer un pattern "tous les lundi-vendredi 11h30-14h"
- Le pattern génère automatiquement des instances de sessions
- Les instances sont créées pour les 90 prochains jours

**Tests**:
- [x] API `POST /groups/:id/recurrence-patterns` crée un pattern
- [x] Pattern génère les bonnes dates (respect des jours de la semaine)
- [x] Instances générées ont le bon groupId, startTime, endTime
- [x] API `GET /groups/:id/recurrence-patterns` liste les patterns

**Tasks**:
1. [x] Créer modèle Prisma `RecurrencePattern`
2. [x] Ajouter `recurrencePatternId` sur Session
3. [x] Créer service `RecurrenceService` avec logique de génération
4. [x] Créer endpoint `POST /groups/:id/recurrence-patterns`
5. [x] Créer endpoint `GET /groups/:id/recurrence-patterns`
6. [x] Créer endpoint `DELETE /recurrence-patterns/:id`
7. [x] UI formulaire de création de récurrence
8. [ ] Tests unitaires pour la génération d'occurrences

**Status**: Complete

---

## Stage 5: Edit Recurring Sessions

**Goal**: Permettre de modifier une instance ou toutes les futures.

**Success Criteria**:
- Modifier "cette séance" détache l'instance du pattern
- Modifier "toutes les futures" met à jour le pattern et régénère
- L'UI propose le choix à l'utilisateur
- L'historique des modifications est préservé

**Tests**:
- [ ] PATCH session avec scope=single met isException=true
- [ ] PATCH session avec scope=future met à jour pattern + régénère
- [ ] Instances passées non affectées par scope=future
- [ ] UI affiche modal de choix

**Tasks**:
1. [ ] Endpoint `PATCH /sessions/:id` avec param `scope`
2. [ ] Logique de détachement (scope=single)
3. [ ] Logique de split pattern (scope=future)
4. [ ] Régénération des instances futures après modification pattern
5. [ ] Frontend : modal "Modifier cette séance / toutes les futures"
6. [ ] Tests E2E des deux scénarios

**Status**: Not Started

---

## Stage 6: Cancel Sessions

**Goal**: Permettre à l'admin du groupe ou au créateur d'une session de la supprimer.

**Success Criteria**:
- Créateur peut supprimer uniquement si aucun participant
- Admin du groupe peut supprimer même avec participants (confirmation)
- Suppression directe (hard delete), la session disparaît de la liste
- Erreur claire si tentative de créer une séance sur un créneau existant

**Tests**:
- [x] DELETE session supprime physiquement (cascade cars/passengers)
- [x] Créateur sans participants → suppression OK
- [x] Créateur avec participants → suppression refusée (403)
- [x] Admin avec participants → confirmation puis suppression OK
- [x] Erreur 409 si créneau déjà pris

**Tasks**:
1. [x] Ajouter `createdById` sur Session (nullable) + relation User
2. [x] Migration Prisma
3. [x] POST /sessions définit `createdById`
4. [x] Recurrence service passe `createdById` du pattern
5. [x] Endpoint `DELETE /sessions/:id` avec vérification permissions
6. [x] Catch erreur P2002 → 409 "Une séance existe déjà sur ce créneau"
7. [x] Frontend : `cancelSession()` dans api.ts
8. [x] Frontend : bouton "Annuler la séance" dans SessionCard
9. [x] Supprimer `@@unique([groupId, date])` pour multiple sessions/jour
10. [x] Changer POST /sessions de `upsert` vers `create`

**Bugfixes** :
- [x] Polling 10s restauré dans UpcomingSessionsList
- [x] onRefresh appelé après join/leave/kick dans CarCard

**Status**: Complete

---

## Stage 7: Upcoming Sessions List View

**Goal**: Afficher la liste des prochaines séances (vue principale mobile).

**Success Criteria**:
- L'utilisateur voit les 10 prochaines séances par défaut
- Chaque carte affiche : date, horaire, nb participants, nb voitures
- On peut rejoindre/quitter directement depuis la liste
- Scroll infini pour charger plus de séances

**Tests**:
- [x] API `GET /groups/:id/sessions/upcoming` paginé
- [x] Sessions triées par startTime croissant
- [x] Sessions passées non incluses (sauf si en cours)
- [x] UI permet join/leave sans navigation

**Tasks**:
1. [x] Endpoint `GET /groups/:id/sessions/upcoming?limit=10&cursor=`
2. [x] Frontend : composant `UpcomingSessionsList`
3. [x] Frontend : composant `SessionCard` (compact)
4. [x] Actions rapides : "Je viens" / "Je viens pas"
5. [x] Scroll infini avec chargement progressif
6. [x] Indicateur de session verrouillée sur la carte

**Status**: Complete

---

## Stage 8: Calendar Week View

**Goal**: Afficher un calendrier semaine en complément de la liste.

**Success Criteria**:
- L'utilisateur peut basculer entre vue liste et calendrier
- Le calendrier affiche la semaine courante par défaut
- Navigation semaine précédente/suivante
- Tap sur un jour affiche les sessions de ce jour

**Tests**:
- [x] Calendrier affiche les bons jours (lun-dim)
- [x] Sessions correctement positionnées sur les jours
- [x] Navigation semaine fonctionne
- [x] Tap jour ouvre détail

**Tasks**:
1. [x] Frontend : composant `WeekCalendar`
2. [x] Frontend : composant `DayCell` avec indicateurs de sessions (intégré dans WeekCalendar)
3. [x] Récupérer sessions de la semaine en une requête (utilise getUpcomingSessions)
4. [x] Toggle liste/calendrier dans l'UI
5. [x] Navigation semaine (prev/next)
6. [x] Responsive : adaptation mobile/desktop (grid 7 colonnes adaptable)

**Status**: Complete

---

## Stage 9: Session Detail Page

**Goal**: Afficher le détail complet d'une séance sélectionnée.

**Success Criteria**:
- Page dédiée avec tous les participants et voitures
- Actions possibles selon état (verrouillé ou non)
- Lien vers modification (si autorisé)
- Affichage du pattern récurrent parent (si applicable)

**Tests**:
- [ ] Page affiche toutes les infos de la session
- [ ] Boutons d'action respectent l'état de verrouillage
- [ ] Indication "Fait partie de [pattern]" si récurrent
- [ ] Lien retour vers liste/calendrier

**Tasks**:
1. [ ] Route `/groups/:groupId/sessions/:sessionId`
2. [ ] Récupérer session avec cars, passengers, recurrencePattern
3. [ ] Afficher infos complètes + statut
4. [ ] Actions : rejoindre, quitter, ajouter voiture
5. [ ] Lien vers édition (si non verrouillé)
6. [ ] Breadcrumb pour navigation

**Status**: Not Started

---

## Stage 10: Create/Edit Session Forms

**Goal**: Formulaires de création et modification de séances.

**Success Criteria**:
- Créer une séance one-off (date + horaires)
- Créer un pattern récurrent (jours + horaires + période)
- Modifier une séance existante (avec choix scope)
- Validation des champs (horaires cohérents, dates futures)

**Tests**:
- [ ] Form one-off crée une session
- [ ] Form récurrent crée un pattern + instances
- [ ] Validation : endTime > startTime
- [ ] Validation : date dans le futur (pour one-off)

**Tasks**:
1. [ ] Frontend : composant `SessionForm` (one-off)
2. [ ] Frontend : composant `RecurrenceForm` (pattern)
3. [ ] Sélecteur de jours de la semaine (toggle buttons)
4. [ ] Time pickers pour startTime/endTime
5. [ ] Date picker pour date unique ou période
6. [ ] Validation côté client + messages d'erreur
7. [ ] Intégration avec les APIs

**Status**: Not Started

---

## Stage 11: Historical Sessions View

**Goal**: Permettre de consulter les séances passées.

**Success Criteria**:
- Lien discret vers l'historique (pas dans la nav principale)
- Liste paginée des 30 derniers jours par défaut
- Filtre par période
- Sessions en lecture seule (pas d'actions)

**Tests**:
- [ ] API `GET /groups/:id/sessions/history` paginé
- [ ] Sessions triées par startTime décroissant
- [ ] Filtre date fonctionne
- [ ] Aucune action possible sur session passée

**Tasks**:
1. [ ] Endpoint `GET /groups/:id/sessions/history?from=&to=&limit=`
2. [ ] Frontend : page `/groups/:id/history`
3. [ ] Lien discret depuis la page groupe (footer ou menu)
4. [ ] Composant `HistorySessionCard` (read-only)
5. [ ] Filtres de date (date picker range)
6. [ ] Pagination

**Status**: Not Started

---

## Stage 12: Polish & Edge Cases

**Goal**: Finaliser les détails et gérer les cas limites.

**Success Criteria**:
- Gestion timezone correcte (Europe/Paris par défaut)
- Sessions qui passent minuit gérées
- Messages d'erreur clairs
- Performance acceptable (< 200ms pour liste)

**Tests**:
- [ ] Sessions affichées en heure locale
- [ ] Session 23h-02h affichée correctement
- [ ] Erreurs API traduites en messages utilisateur
- [ ] Temps de réponse < 200ms (mesure)

**Tasks**:
1. [ ] Ajouter `timezone` sur Group (migration)
2. [ ] Formater dates avec date-fns-tz
3. [ ] Gérer sessions cross-midnight
4. [ ] Audit des messages d'erreur
5. [ ] Optimisation requêtes (indexes, includes)
6. [ ] Tests de charge basiques

**Status**: Not Started

---

## Technical Notes

### Schema Changes (Prisma)

```prisma
model RecurrencePattern {
  id          String    @id @default(cuid())
  groupId     String
  startTime   DateTime  // Heure de début (ex: 11:30)
  endTime     DateTime  // Heure de fin (ex: 14:00)
  daysOfWeek  Int[]     // [1,2,3,4,5] pour lun-ven
  startDate   DateTime  @db.Date
  endDate     DateTime? @db.Date
  createdById String
  createdAt   DateTime  @default(now())

  group       Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  createdBy   User      @relation(fields: [createdById], references: [id])
  sessions    Session[]
  exceptions  RecurrenceException[]
}

model RecurrenceException {
  id           String   @id @default(cuid())
  patternId    String
  date         DateTime @db.Date
  reason       String?  // "cancelled", "holiday"

  pattern      RecurrencePattern @relation(fields: [patternId], references: [id], onDelete: Cascade)
}

model Session {
  // ... champs existants ...
  startTime           DateTime
  endTime             DateTime
  createdById         String?
  recurrencePatternId String?
  isException         Boolean       @default(false)

  createdBy           User?              @relation("sessionsCreated", fields: [createdById], references: [id], onDelete: SetNull)
  recurrencePattern   RecurrencePattern? @relation(fields: [recurrencePatternId], references: [id], onDelete: SetNull)

  @@unique([groupId, startTime])
  @@index([groupId, date])
}

model Group {
  // ... champs existants ...
  timezone                 String @default("Europe/Paris")
  registrationLockMinutes  Int    @default(0)
}
```

### API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/groups/:id/sessions/upcoming` | GET | Prochaines sessions (paginé) |
| `/groups/:id/sessions/history` | GET | Sessions passées (paginé) |
| `/groups/:id/recurrence-patterns` | GET | Patterns du groupe |
| `/groups/:id/recurrence-patterns` | POST | Créer un pattern |
| `/recurrence-patterns/:id` | DELETE | Supprimer un pattern |
| `/sessions/:id` | PATCH | Modifier (scope=single|future) |
| `/sessions/:id` | DELETE | Supprimer (hard delete, permissions admin/creator) |
| `/sessions/:id/lock-status` | GET | État de verrouillage |

### Indexes Required

```sql
CREATE INDEX idx_session_group_start ON sessions(group_id, start_time);
CREATE INDEX idx_session_start_status ON sessions(start_time, status);
CREATE INDEX idx_session_pattern ON sessions(recurrence_pattern_id);
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Migration casse les sessions existantes | Migration réversible, backup avant déploiement |
| Performance avec beaucoup d'instances | Pagination, fenêtre de génération limitée, indexes |
| Confusion timezone | Afficher toujours "heure de Paris" avec indicateur clair |
| Conflits de modification concurrente | Optimistic locking sur les updates |

---

## Definition of Done

Chaque stage est considéré terminé quand :
- [ ] Tous les tests passent (unit + integration)
- [ ] Code review effectuée
- [ ] Pas d'erreurs console/réseau
- [ ] Documentation API à jour (si applicable)
- [ ] Testé sur mobile (responsive)
