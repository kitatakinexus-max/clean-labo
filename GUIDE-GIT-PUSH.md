# Guide pour pousser votre code sur GitHub

## Prérequis
- Un compte GitHub

---

## Étape 1 : Créer un dépôt GitHub

1. Allez sur [github.com](https://github.com)
2. Cliquez sur **"+"** > **"New repository"**
3. Nommez-le : `clean-labo-main`
4. Laissez "Public" sélectionné
5. Cliquez **"Create repository"**
6. **Copiez l'URL** du dépôt (elle ressemble à : `https://github.com/votre-nom/clean-labo-main.git`)

---

## Étape 2 : Configurer Git (si pas encore fait)

Ouvrez votre terminal et exécutez ces commandes :

```bash
git config --global user.email "votre-email@exemple.com"
git config --global user.name "Votre Nom"
```

---

## Étape 3 : Pousser le code sur GitHub

Dans le dossier de votre projet, exécutez ces commandes :

```bash
# Ajouter le dépôt distant (remplacez par votre URL GitHub)
git remote add origin https://github.com/votre-nom/clean-labo-main.git

# Pousser le code
git push -u origin master
```

---

## Commandes utiles pour les futures mises à jour

```bash
# Ajouter les modifications
git add .

# Créer un commit
git commit -m "Description de vos changements"

# Pousser les modifications
git push
```

---

## Après le push

1. Allez sur votre dépôt GitHub
2. Vérifiez que tous les fichiers sont là
3. Render détectera automatiquement les changements et redéployera

---

## ⚠️ Important

Le fichier `.env` n'est **pas** poussé sur GitHub (il est dans le .gitignore). 
Vous devrez configurer vos variables d'environnement directement sur Render.
