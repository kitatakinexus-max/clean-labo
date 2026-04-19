// ============================================================================
// FIREBASE ADMIN SDK - Initialisation et export des services
// ============================================================================

require('dotenv').config();
const admin = require('firebase-admin');

let db = null;
let firebaseInitialized = false;

/**
 * Initialise Firebase Admin SDK en utilisant les variables d'environnement.
 * Gère le cas où Firebase est déjà initialisé (HMR / module cache).
 */
function initializeFirebase() {
    try {
        // Éviter la double initialisation
        if (admin.apps.length > 0) {
            db = admin.firestore();
            firebaseInitialized = true;
            return true;
        }

        const fs = require('fs');
        const path = require('path');
        const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

        // MÉTHODE 1 : Fichier JSON local (La plus stable sur Hostinger)
        if (fs.existsSync(serviceAccountPath)) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccountPath),
            });
            console.log('✅ Firebase Admin SDK initialisé via fichier JSON');
        } 
        // MÉTHODE 2 : Variables d'environnement (Repli)
        else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: (function() {
                        let key = process.env.FIREBASE_PRIVATE_KEY;
                        if (!key) return undefined;
                        key = key.replace(/^['"]|['"]$/g, '');
                        if (!key.includes('-----BEGIN') && !key.includes('\n') && key.length > 500) {
                            return Buffer.from(key, 'base64').toString('utf-8');
                        }
                        return key.replace(/\\n/g, '\n');
                    })(),
                }),
            });
            console.log('✅ Firebase Admin SDK initialisé via Environnement');
        } else {
            console.warn('⚠️  Firebase: Aucune méthode d\'authentification trouvée (ni JSON, ni ENV).');
            return false;
        }

        db = admin.firestore();
        firebaseInitialized = true;
        return true;
    } catch (error) {
        console.error('❌ Erreur initialisation Firebase:', error.message);
        return false;
    }
}

/**
 * Vérifie un ID Token Firebase côté serveur.
 * Utilisé pour l'authentification via l'API REST Firebase Auth.
 */
async function verifyIdToken(idToken) {
    if (!firebaseInitialized) {
        throw new Error('Firebase non initialisé');
    }
    return await admin.auth().verifyIdToken(idToken);
}

// Initialiser au démarrage
initializeFirebase();

module.exports = {
    get db() { return db; },
    get auth() { return admin.apps.length > 0 ? admin.auth() : null; },
    get isInitialized() { return firebaseInitialized; },
    verifyIdToken,
};
