# Plan d'implémentation - Voitures personnelles (UserCar)

## Stage 1: Modèle de données et backend
**Goal**: Créer le modèle UserCar, les migrations et les routes API
**Success Criteria**: Les endpoints API fonctionnent et retournent les bonnes données
**Tests**: Tests manuels avec curl/Postman
**Status**: Complete

### Modifications effectuées:
- ✅ Ajout du modèle `UserCar` dans `schema.prisma`
- ✅ Modification de `User`, `Avatar`, et `Car` pour les relations
- ✅ Ajout d'avatars de voitures dans `seed.ts`
- ✅ Création de `routes/userCars.ts` avec CRUD complet
- ✅ Modification de `routes/cars.ts` pour accepter `userCarId`
- ✅ Enregistrement du router dans `index.ts`

## Stage 2: API frontend et store
**Goal**: Créer les méthodes API et le store Zustand pour UserCar
**Success Criteria**: Les appels API fonctionnent depuis le frontend
**Tests**: Tests d'intégration frontend-backend
**Status**: Complete

### Modifications effectuées:
- ✅ Ajout de types `UserCar` dans `lib/api.ts`
- ✅ Modification de l'interface `Car` pour inclure `userCar`
- ✅ Ajout des méthodes API pour UserCar
- ✅ Modification de `addCar()` pour accepter `userCarId`
- ✅ Création du store `stores/userCars.ts`
- ✅ Mise à jour du store `stores/session.ts`

## Stage 3: Composants UI
**Goal**: Créer les composants UserCarCard et UserCarSelector
**Success Criteria**: Les composants s'affichent correctement et sont interactifs
**Tests**: Tests visuels et d'interaction
**Status**: Complete

### Modifications effectuées:
- ✅ Création de `components/UserCarCard.tsx`
- ✅ Création de `components/UserCarSelector.tsx`
- ✅ Modification de `components/CarCard.tsx` pour afficher l'avatar de voiture

## Stage 4: Intégration dans ProfilePage
**Goal**: Permettre la gestion des voitures depuis le profil
**Success Criteria**: L'utilisateur peut créer, modifier et supprimer ses voitures
**Tests**: Tests E2E du workflow complet
**Status**: Complete

### Modifications effectuées:
- ✅ Ajout de la section "Mes voitures" dans `ProfilePage.tsx`
- ✅ Modal de création/édition de voiture
- ✅ Intégration du store `userCars`

## Stage 5: Intégration dans GroupPage
**Goal**: Utiliser le UserCarSelector lors de l'ajout d'une voiture
**Success Criteria**: L'utilisateur peut sélectionner une voiture existante ou en créer une nouvelle
**Tests**: Tests E2E du workflow complet
**Status**: Complete

### Modifications effectuées:
- ✅ Remplacement du modal simple par `UserCarSelector`
- ✅ Transmission de `userCarId` à l'API

---

## Commandes à exécuter

### 1. Migration Prisma
```bash
cd packages/backend
npx prisma migrate dev --name add-user-cars
npx prisma generate
```

### 2. Seed (optionnel, pour ajouter les avatars de voitures)
```bash
cd packages/backend
npx prisma db seed
```

### 3. Rebuild et redémarrage Docker
```bash
cd /home/cyril/pioum
docker-compose down
docker-compose up --build -d
```

### 4. Vérification
```bash
# Vérifier les logs backend
docker logs pioum-backend

# Vérifier les logs frontend
docker logs pioum-frontend

# Tester l'application
# Ouvrir http://localhost:5173 dans le navigateur
```

---

## Tests à effectuer

### Backend
- [ ] GET /api/user-cars - Retourne une liste vide au début
- [ ] POST /api/user-cars - Crée une nouvelle voiture
- [ ] PATCH /api/user-cars/:id - Modifie une voiture
- [ ] DELETE /api/user-cars/:id - Supprime une voiture
- [ ] POST /api/cars avec userCarId - Utilise les infos de la voiture

### Frontend
#### ProfilePage
- [ ] La section "Mes voitures" s'affiche
- [ ] Cliquer sur "Ajouter" ouvre le modal
- [ ] Créer une voiture fonctionne
- [ ] Modifier une voiture fonctionne
- [ ] Supprimer une voiture fonctionne

#### GroupPage
- [ ] Cliquer sur "J'ai ma voiture" ouvre le UserCarSelector
- [ ] Sélectionner une voiture existante fonctionne
- [ ] Créer une nouvelle voiture depuis le selector fonctionne
- [ ] La voiture ajoutée affiche le bon avatar et nom
- [ ] Les places par défaut sont correctement utilisées

---

## Notes techniques

### Cascade delete
- Quand un User est supprimé, ses UserCars sont supprimés (onDelete: Cascade)
- Quand un UserCar est supprimé, les Cars qui l'utilisent gardent une référence null (onDelete: SetNull)

### Validation
- Les avatars de voitures sont filtrés par category === 'cars'
- Les noms de voitures sont optionnels
- Les places par défaut doivent être entre 1 et 10

### UX
- Les avatars de voitures peuvent être des emojis ou des URLs
- Le nom de la voiture est optionnel, sinon on affiche le nom de l'avatar
- L'utilisateur peut modifier le nombre de places pour chaque session
