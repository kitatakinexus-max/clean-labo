# Guide de Déploiement Gratuit sur Render

Ce guide étape par étape vous permettra de déployer votre site **Clean Laboratoire** sur Render gratuitement.

---

## 📋 Prérequis

- Un compte [Render](https://render.com) (gratuit)
- Votre code pushed sur GitHub, GitLab ou Bitbucket

---

## Étape 1 : Préparer votre projet pour la production

### 1.1 Mettre à jour le fichier `render.yaml`

Le fichier [`render.yaml`](render.yaml) est déjà configuré. Vérifiez qu'il contient :

```yaml
services:
  - type: web
    name: clean-laboratoire
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

### 1.2 Vérifier le fichier `package.json`

Assurez-vous que le script `start` est configuré dans [`package.json`](package.json:7) :

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

✅ **C'est déjà configuré dans votre projet !**

---

## Étape 2 : Configurer les variables d'environnement sur Render

Votre application utilise plusieurs services qui nécessitent des variables d'environnement. Vous devrez les configurer sur Render.

### Variables nécessaires :

| Variable | Description | Où la trouver |
|----------|-------------|---------------|
| `NODE_ENV` | Doit être `production` | - |
| `PORT` | Laissez vide (Render le fournit) | - |
| `FIREBASE_PROJECT_ID` | ID du projet Firebase | Firebase Console > Paramètres |
| `FIREBASE_CLIENT_EMAIL` | Email du service account | Firebase Console > Comptes de service |
| `FIREBASE_PRIVATE_KEY` | Clé privée du service account | Firebase Console > Générer une clé privée |
| `ADMIN_SESSION_SECRET` | Secret pour les sessions admin | Créez une chaîne aléatoire sécurisée |
| `FIREBASE_WEB_API_KEY` | Clé API Firebase | Firebase Console > Paramètres généraux |
| `DOMAIN` | URL de production | https://votre-site.onrender.com |

### ⚠️ Important : Autoriser le domaine dans Firebase Console

Avant de déployer, vous devez ajouter le domaine Render dans la console Firebase :

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Sélectionnez votre projet `site-maxime-e580d`
3. Allez dans **Authentication** > **Settings**
4. Faites défiler jusqu'à **"Authorized domains"**
5. Cliquez sur **"Add domain"**
6. Entrez votre domaine Render : `onrender.com` (pour permettre tous les sous-domaines)
   - Ou entrez votre domaine spécifique : `clean-laboratoire.onrender.com`
7. Cliquez sur **"Add"**

🔒 **Ceci est essentiel** pour que l'authentification Firebase fonctionne sur votre site déployé.

### Variables optionnelles (si vous utilisez ces services) :

| Variable | Description |
|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Cloud Name Cloudinary |
| `CLOUDINARY_API_KEY` | API Key Cloudinary |
| `CLOUDINARY_API_SECRET` | API Secret Cloudinary |
| `TWILIO_ACCOUNT_SID` | Account SID Twilio |
| `TWILIO_AUTH_TOKEN` | Auth Token Twilio |
| `TWILIO_PHONE_NUMBER` | Numéro de téléphone Twilio |
| `EMAIL_HOST` | Serveur SMTP (ex: smtp.gmail.com) |
| `EMAIL_PORT` | Port SMTP (ex: 587) |
| `EMAIL_USER` | Email SMTP |
| `EMAIL_PASS` | Mot de passe SMTP |

---

## Étape 3 : Déployer sur Render

### Option A : Déploiement automatique (recommandé)

1. **Connectez-vous à Render** sur https://render.com

2. **Cliquez sur "New +"** puis sélectionnez **"Web Service"**

3. **Connectez votre dépôt Git** :
   - Autorisez Render à accéder à votre repository
   - Sélectionnez le dépôt `clean-labo-main`

4. **Configurez le service** :
   - **Name** : `clean-laboratoire`
   - **Environment** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`

5. **Cliquez sur "Create Web Service"**

6. **Ajoutez les variables d'environnement** :
   - Allez dans l'onglet **"Environment"**
   - Ajoutez chaque variable listée dans l'Étape 2
   - Cliquez sur **"Save Changes"**

7. **Le déploiement commence** ! Attendez 2-5 minutes.

### Option B : Déploiement avec render.yaml (automatique)

Si vous avez push le fichier `render.yaml` sur GitHub :

1. Render détectera automatiquement le fichier
2. Allez sur le dashboard Render
3. Cliquez sur **"New +"** > **"Blueprint"**
4. Sélectionnez votre dépôt
5. Cliquez sur **"Apply Blueprint"**

---

## Étape 4 : Vérifier le déploiement

1. Une fois le déploiement terminé, Render vous donne une URL comme :
   `https://clean-laboratoire.onrender.com`

2. **Testez votre site** :
   - La page d'accueil fonctionne ?
   - Le tableau de bord admin fonctionne ?
   - Les formulaires envoient des emails ?

---

## Étape 5 : Configuration du domaine personnalisé (optionnel)

### Ajouter un domaine gratuit sur Render

1. Allez dans votre service Render > **"Settings"**

2. Faites défiler jusqu'à **"Custom Domains"**

3. Cliquez sur **"Add Custom Domain"**

4. Entrez votre domaine (ex: `www.mon-site.com`)

5. **Configurez les DNS** chez votre registrar :
   - Ajoutez un enregistrement **CNAME** :
     - Nom : `www`
     - Valeur : `your-render-service.onrender.com`

6. Attendez jusqu'à 24h pour la propagation DNS

### Pour un domaine gratuit

Vous pouvez utiliser :
- **Freenom** pour des domaines `.tk`, `.ml`, `.ga`, etc.
- Ou acheter un domaine sur **Namecheap** (environ 5-10$/an)

---

## 🔧 Dépannage

### Erreur "Failed to build"

1. Vérifiez les logs dans Render > votre service > **"Logs"**
2. Assurez-vous que toutes les dépendances sont dans `package.json`
3. Vérifiez que Node version est compatible (v18+)

### Erreur "Application failed to start"

1. Vérifiez que `PORT` est lu correctement : `const PORT = process.env.PORT || 3000;`
2. Vérifiez que `server.js` est le bon point d'entrée

### Problèmes avec Firebase

1. Vérifiez que `FIREBASE_PRIVATE_KEY` est correctement formatée (avec les `\n`)
2. Assurez-vous que le service account a les bonnes permissions

### Session admin ne fonctionne pas

1. Régénérez un nouveau `ADMIN_SESSION_SECRET` sécurisé
2. Mettre à jour sur Render

---

## 💰 Informations importantes

### Gratuité Render

- **Web Service gratuit** : 750 heures/mois
- **Bandwidth** : 100 Go/mois
- ** Sleep** : Le service se met en veille après 15 min d'inactivité (se réveille en ~30s)

### Pour garder le site toujours actif

Si vous avez un compte gratuit et voulez éviter la mise en veille :

1. Utilisez un service de ping gratuit comme :
   - [UptimeRobot](https://uptimerobot.com)
   - [Pingdom](https://pingdom.com)

2. Configurez un ping toutes les 25 minutes vers votre URL Render

---

## 📝 Checklist avant déploiement

- [ ] Code push sur GitHub
- [ ] Toutes les variables d'environnement documentées
- [ ] `package.json` vérifié (script start présent)
- [ ] `server.js` utilise `process.env.PORT`
- [ ] Compte Render créé
- [ ] Variables d'environnement configurées sur Render

---

## 🔗 Liens utiles

- [Dashboard Render](https://dashboard.render.com)
- [Documentation Render](https://render.com/docs)
- [Node.js sur Render](https://render.com/docs/node-version)

---

## ✅ Prochaine étape

Après le déploiement, n'oubliez pas de :
1. Tester toutes les fonctionnalités
2. Configurer un domaine personnalisé (optionnel)
3. Mettre en place un monitoring basique (optionnel)

---

*Guide créé pour le projet Clean Laboratoire - Deployé sur Render*
