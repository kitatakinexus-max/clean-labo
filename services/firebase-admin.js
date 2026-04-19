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
    // Vérifier si les credentials sont configurés
    if (
        !process.env.FIREBASE_PROJECT_ID ||
        process.env.FIREBASE_PROJECT_ID === 'your-project-id' ||
        !process.env.FIREBASE_CLIENT_EMAIL ||
        !process.env.FIREBASE_PRIVATE_KEY
    ) {
        console.warn('⚠️  Firebase: credentials non configurés dans .env. Utilisation du fallback JSON local.');
        return false;
    }

    try {
        // Éviter la double initialisation (utile avec nodemon)
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    // Détection et décodage Base64 si nécessaire, sinon parsing PEM classique
                    privateKey: (function() {
                        let key = process.env.FIREBASE_PRIVATE_KEY;
                        if (!key) return undefined;
                        // Nettoyer les guillemets accidentels
                        key = key.replace(/^['"]|['"]$/g, '');
                        // Si la clé ne contient pas les marqueurs PEM mais ressemble à du Base64, on la décode
                        if (!key.includes('-----BEGIN') && !key.includes('\n') && key.length > 500) {
                            return Buffer.from(key, 'base64').toString('utf-8');
                        }
                        // Sinon, parsing PEM robuste habituel
                        return key.replace(/\\n/g, '\n');
                    })(),
                }),
            });
        }

        db = admin.firestore();
        firebaseInitialized = true;
        console.log('✅ Firebase Admin SDK initialisé avec succès');
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
