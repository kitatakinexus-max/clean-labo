#!/usr/bin/env node
// ============================================================================
// SCRIPT DE CRÉATION D'ADMIN FIREBASE AUTH
// Crée un utilisateur dans Firebase Authentication avec les credentials .env
//
// USAGE: node scripts/create-admin.js
// ============================================================================

require('dotenv').config();
const { auth, isInitialized } = require('../services/firebase-admin');

const adminEmail = process.env.ADMIN_EMAIL || 'admin@clean-lab.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'changeme_admin_password';

async function createAdmin() {
    if (!isInitialized) {
        console.error('❌ Firebase n\'est pas initialisé. Vérifiez vos credentials dans .env');
        process.exit(1);
    }

    console.log(`👤 Tentative de création du compte admin: ${adminEmail}...`);

    try {
        // Vérifier si l'utilisateur existe déjà
        let user;
        try {
            user = await auth.getUserByEmail(adminEmail);
            console.log('ℹ️  L\'utilisateur existe déjà. Mise à jour du mot de passe...');
            await auth.updateUser(user.uid, {
                password: adminPassword,
            });
            console.log('✅ Mot de passe mis à jour avec succès');
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                user = await auth.createUser({
                    email: adminEmail,
                    password: adminPassword,
                    emailVerified: true,
                    displayName: 'Admin Clean Lab',
                });
                console.log('✅ Compte administrateur créé avec succès !');
            } else {
                throw error;
            }
        }
        
        console.log('\n🎉 Configuration Admin terminée !');
    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'admin:', error.message);
    }

    process.exit(0);
}

createAdmin().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
});
