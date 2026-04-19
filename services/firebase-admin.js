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
        if (admin.apps.length > 0) {
            db = admin.firestore();
            firebaseInitialized = true;
            return true;
        }

        const fs = require('fs');
        const path = require('path');
        const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

        // MÉTHODE 1 : Variable Base64 (La plus robuste sur Hostinger)
        if (process.env.FIREBASE_CONFIG_BASE64) {
            const configBuffer = Buffer.from(process.env.FIREBASE_CONFIG_BASE64, 'base64');
            const serviceAccount = JSON.parse(configBuffer.toString('utf-8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('✅ Firebase Admin SDK initialisé via FIREBASE_CONFIG_BASE64');
        } 
        // MÉTHODE 2 : Fichier JSON local (Fallack)
        else if (fs.existsSync(serviceAccountPath)) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccountPath),
            });
            console.log('✅ Firebase Admin SDK initialisé via fichier JSON');
        } 
        // MÉTHODE 3 : Variables d'environnement individuelles (Fallack)
        else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
            // ... (reste du code pour les variables individuelles)
            console.log('✅ Firebase Admin SDK initialisé via Environnement');
        } else {
            console.warn('⚠️  Firebase: Aucune méthode d\'authentification trouvée.');
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
