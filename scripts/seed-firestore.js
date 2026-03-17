#!/usr/bin/env node
// ============================================================================
// SCRIPT DE SEED FIRESTORE
// Initialise Firestore avec les données par défaut des fichiers locales/*.json
// et les informations de l'entreprise.
//
// USAGE: node scripts/seed-firestore.js
// ============================================================================

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { db, isInitialized } = require('../services/firebase-admin');

const LANGUAGES = ['fr', 'en', 'ar', 'es', 'de', 'hi'];

// Informations entreprise par défaut
const DEFAULT_COMPANY_INFO = {
    name: "Clean Laboratoire",
    phone: process.env.COMPANY_PHONE || "+33 1 23 45 67 89",
    email: process.env.COMPANY_EMAIL || "contact@clean-lab.com",
    address: process.env.COMPANY_ADDRESS || "Paris, France",
    whatsapp: process.env.WHATSAPP_NUMBER || "33612345678",
    telegram: "",
    updatedAt: new Date().toISOString(),
};

async function seedFirestore() {
    if (!isInitialized) {
        console.error('❌ Firebase n\'est pas initialisé. Vérifiez vos credentials dans .env');
        process.exit(1);
    }

    console.log('🌱 Démarrage du seed Firestore...\n');

    // 1. Seed des traductions
    for (const lang of LANGUAGES) {
        const filePath = path.join(__dirname, '..', 'locales', `${lang}.json`);

        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  Fichier manquant: locales/${lang}.json - ignoré`);
            continue;
        }

        try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Stocker dans Firestore: siteContent/{lang}
            await db.collection('siteContent').doc(lang).set({
                ...content,
                _meta: {
                    lang,
                    updatedAt: new Date().toISOString(),
                    source: 'seed',
                }
            });

            console.log(`✅ Langue "${lang}" seedée avec succès`);
        } catch (error) {
            console.error(`❌ Erreur pour ${lang}:`, error.message);
        }
    }

    // 2. Seed des infos entreprise
    try {
        await db.collection('siteConfig').doc('companyInfo').set(DEFAULT_COMPANY_INFO);
        console.log('\n✅ Company Info seedée avec succès');
    } catch (error) {
        console.error('❌ Erreur Company Info:', error.message);
    }

    console.log('\n🎉 Seed Firestore terminé !');
    console.log('   Vous pouvez maintenant démarrer le serveur: npm run dev');

    process.exit(0);
}

seedFirestore().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
});
