# 🦅 MINE DE L'AIGLE — Guide de Déploiement

## Ce que tu vas obtenir

Une application web accessible par tous tes employés via un lien du type :
`https://tonpseudo.github.io/mine-aigle/`

Les données sont partagées en temps réel : quand un mineur déclare sa production,
tu vois le stock bouger immédiatement de ton côté.

---

## Pré-requis

- Un ordinateur avec un navigateur web
- Savoir copier-coller (c'est tout ce qu'il faudra faire)

---

## ÉTAPE 1 — Créer un compte GitHub (2 min)

1. Va sur https://github.com/signup
2. Crée un compte gratuit (choisis un pseudo, ex: `mine-aigle-rp`)
3. Confirme ton email

---

## ÉTAPE 2 — Créer le projet Firebase (5 min)

Firebase est la base de données gratuite de Google. Voici comment la configurer :

1. Va sur https://console.firebase.google.com/
2. Connecte-toi avec un compte Google (Gmail)
3. Clique sur **"Ajouter un projet"** (ou "Create a project")
4. Nom du projet : `mine-aigle` → Clique **Continuer**
5. Désactive Google Analytics (pas besoin) → Clique **Créer le projet**
6. Attends que le projet soit créé, puis clique **Continuer**

### Activer la base de données Realtime Database

7. Dans le menu à gauche, clique sur **"Créer"** puis **"Realtime Database"**
8. Clique **"Créer une base de données"**
9. Emplacement : choisis **europe-west1 (Belgique)** → **Suivant**
10. Choisis **"Démarrer en mode test"** → **Activer**
    ⚠️ Le mode test donne un accès ouvert pendant 30 jours.
    On sécurisera après.

### Récupérer les identifiants Firebase

11. En haut à gauche, clique sur la **roue dentée ⚙️** → **Paramètres du projet**
12. Descends jusqu'à **"Vos applications"** → Clique sur l'icône **Web** `</>`
13. Nom de l'application : `mine-aigle` → Clique **Enregistrer l'application**
14. Tu vas voir un bloc de code comme ceci :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "mine-aigle.firebaseapp.com",
  databaseURL: "https://mine-aigle-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mine-aigle",
  storageBucket: "mine-aigle.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

15. **COPIE CES VALEURS** — tu en auras besoin à l'étape 4

---

## ÉTAPE 3 — Installer les outils sur ton PC (5 min)

### Installer Node.js

1. Va sur https://nodejs.org/
2. Télécharge la version **LTS** (le gros bouton vert)
3. Installe-le en suivant les étapes (tout par défaut)
4. Redémarre ton ordinateur

### Installer Git

1. Va sur https://git-scm.com/downloads
2. Télécharge et installe Git pour ton système
3. Tout par défaut dans l'installation

### Vérifier que tout marche

Ouvre un terminal (Windows : tape "cmd" dans la barre de recherche) et tape :

```
node --version
git --version
```

Si tu vois des numéros de version, c'est bon !

---

## ÉTAPE 4 — Configurer le projet (3 min)

1. Décompresse le dossier `mine-aigle-deploy` que je t'ai fourni
2. Ouvre le fichier `src/firebase.js` avec un éditeur de texte (Bloc-notes suffit)
3. Remplace les valeurs `VOTRE_API_KEY`, `VOTRE_PROJET`, etc. par celles
   que tu as copiées à l'étape 2 (point 14)
4. Sauvegarde le fichier

5. Ouvre le fichier `package.json`
6. Remplace `TONPSEUDO` dans la ligne `"homepage"` par ton pseudo GitHub
   Exemple : `"homepage": "https://mine-aigle-rp.github.io/mine-aigle"`
7. Sauvegarde

---

## ÉTAPE 5 — Déployer sur GitHub Pages (5 min)

Ouvre un terminal dans le dossier du projet et tape ces commandes une par une :

```bash
# Installer les dépendances (1ère fois seulement, prend 2-3 min)
npm install

# Configurer Git avec ton pseudo GitHub
git config --global user.name "tonpseudo"
git config --global user.email "ton@email.com"

# Initialiser le dépôt Git
git init
git add .
git commit -m "Mine de l'Aigle v1"

# Créer le dépôt sur GitHub :
# 1. Va sur https://github.com/new
# 2. Nom du dépôt : mine-aigle
# 3. Laisse en Public
# 4. Ne coche rien d'autre
# 5. Clique "Create repository"
# 6. GitHub te donne une URL, copie-la

# Lier ton projet au dépôt GitHub (remplace l'URL)
git remote add origin https://github.com/TONPSEUDO/mine-aigle.git
git branch -M main
git push -u origin main

# Déployer sur GitHub Pages
npm run deploy
```

Attends 2-3 minutes, puis ton site est en ligne à :
`https://TONPSEUDO.github.io/mine-aigle/`

---

## ÉTAPE 6 — Sécuriser Firebase (après les 30 jours de test)

Au bout de 30 jours, le mode test expire. Va dans Firebase Console :

1. **Realtime Database** → **Règles**
2. Remplace le contenu par :

```json
{
  "rules": {
    "mine-data": {
      ".read": true,
      ".write": true
    }
  }
}
```

3. Clique **Publier**

Cela permet à tout le monde de lire et écrire les données de la mine
(c'est ce qu'on veut pour un usage RP entre joueurs de confiance).

---

## Utilisation quotidienne

- **Tes employés** vont sur le lien et se connectent avec leur nom
- **Toi** tu te connectes avec le code patron : `Aigle1899`
- Les données se synchronisent en temps réel entre tous les utilisateurs
- Aucune maintenance nécessaire

---

## Mettre à jour l'application

Si tu me demandes des modifications, je te fournirai les fichiers mis à jour.
Il suffira de :

1. Remplacer les fichiers modifiés dans le dossier
2. Ouvrir un terminal dans le dossier
3. Taper :

```bash
git add .
git commit -m "Mise à jour"
git push origin main
npm run deploy
```

---

## En cas de problème

- **Le site ne s'affiche pas** : attends 5 minutes après le deploy,
  GitHub Pages peut prendre un peu de temps
- **Les données ne se sauvent pas** : vérifie que les identifiants
  Firebase dans `src/firebase.js` sont corrects
- **Erreur npm install** : vérifie que Node.js est bien installé
  (`node --version` doit afficher un numéro)

---

## Coût total : 0€

- GitHub Pages : gratuit
- Firebase Realtime Database (plan Spark) : gratuit
  - 1 Go de stockage
  - 10 Go de téléchargement/mois
  - 100 connexions simultanées
  - Largement suffisant pour un serveur RP
