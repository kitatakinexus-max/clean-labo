// ============================================================================
// IMPORTS ET CONFIGURATION DE BASE
// ============================================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase Admin (avec fallback gracieux si non configuré)
const firebase = require('./services/firebase-admin');

// Middleware admin auth
const { requireAdminAuth } = require('./middlewares/adminAuth');

// Twilio Service
const twilioService = require('./services/twilio');

// ============================================================================
// MIDDLEWARES ESSENTIELS
// ============================================================================

app.set('trust proxy', 1); // Nécessaire si derrière un proxy (comme Nginx)

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Sessions (pour l'authentification admin) - cookie-session pour persistance
app.use(cookieParser());
app.use(cookieSession({
    name: 'session',
    keys: [process.env.ADMIN_SESSION_SECRET || 'clean-lab-admin-secret-change-in-prod'],
    maxAge: 8 * 60 * 60 * 1000, // 8 heures
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en production
    sameSite: 'lax',
}));

// Middleware pour compatibilité avec express-session
app.use((req, res, next) => {
    req.session = req.session || {};
    next();
});

// ============================================================================
// CONFIGURATION DU MOTEUR DE TEMPLATE EJS
// ============================================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================================================
// SERVIR LES FICHIERS STATIQUES
// ============================================================================

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1y',
    etag: false
}));

// ============================================================================
// CHARGEMENT DES TRADUCTIONS (JSON local — fallback)
// ============================================================================

const localTranslations = {};
const localesDir = path.join(__dirname, 'locales');
const languages = ['fr', 'en', 'ar', 'es', 'de', 'hi'];

languages.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    if (fs.existsSync(filePath)) {
        localTranslations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
        console.warn(`⚠️ Fichier de traduction manquant: ${filePath}`);
    }
});

// ============================================================================
// CACHE FIRESTORE (TEMPS RÉEL)
// ============================================================================

let translationsCache = {};      // { fr: {...}, en: {...}, ... }
let companyInfoCache = null;     // { phone, email, ... }
let twilioConfigCache = {};      // { sid, token, from, recipients: [] }
let assetsCache = {};           // { "/img/slider-1.png": "https://..." }

/**
 * Initialise le cache et configure les écouteurs temps réel Firestore.
 */
async function initializeCache() {
    // 1. Fallback initial immédiat
    for (const lang of languages) {
        translationsCache[lang] = localTranslations[lang] || {};
    }
    companyInfoCache = getDefaultCompanyInfo();

    if (!firebase.isInitialized || !firebase.db) {
        console.log('⚠️ Mode sans Firebase: cache initialisé avec fichiers locaux.');
        return;
    }

    try {
        console.log('🔄 Chargement initial depuis Firestore...');
        // 2. Premier fetch pour s'assurer que les données sont prêtes
        const translationsPromise = Promise.all(
            languages.map(async lang => {
                const doc = await firebase.db.collection('siteContent').doc(lang).get();
                if (doc.exists) {
                    const data = doc.data();
                    delete data._meta;
                    // Fusion profonde : le local sert de base, Firebase écrase
                    if (!translationsCache[lang]) translationsCache[lang] = { ...localTranslations[lang] };
                    deepMerge(translationsCache[lang], data);
                }
            })
        );
        
        const companyInfoPromise = firebase.db.collection('siteConfig').doc('companyInfo').get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (!data.phones) data.phones = data.phone ? [data.phone] : [];
                companyInfoCache = data;
            }
        });

        const twilioConfigPromise = firebase.db.collection('siteConfig').doc('twilio').get().then(doc => {
            if (doc.exists) {
                twilioConfigCache = doc.data();
                twilioService.init(twilioConfigCache);
            }
        });

        const assetsPromise = firebase.db.collection('siteConfig').doc('assets').get().then(doc => {
            if (doc.exists) {
                assetsCache = doc.data();
            }
        });

        await Promise.all([translationsPromise, companyInfoPromise, twilioConfigPromise, assetsPromise]);
        console.log('✅ Cache initial chargé avec succès depuis Firestore');

        // 3. Attacher les écouteurs "onSnapshot" pour des MAJ en Temps Réel
        firebase.db.collection('siteContent').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added' || change.type === 'modified') {
                    const lang = change.doc.id;
                    const data = change.doc.data();
                    delete data._meta;
                    // MAJ du cache avec fusion
                    if (!translationsCache[lang]) translationsCache[lang] = { ...localTranslations[lang] };
                    deepMerge(translationsCache[lang], data);
                    console.log(`📡 [Temps Réel] Contenu mis à jour pour la langue: ${lang}`);
                }
            });
        }, err => console.error('🔥 Erreur listener siteContent:', err.message));

        firebase.db.collection('siteConfig').doc('companyInfo').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (!data.phones) data.phones = data.phone ? [data.phone] : [];
                companyInfoCache = data;
                console.log(`📡 [Temps Réel] Informations entreprise mises à jour`);
            }
        }, err => console.error('🔥 Erreur listener companyInfo:', err.message));

        firebase.db.collection('siteConfig').doc('twilio').onSnapshot(doc => {
            if (doc.exists) {
                twilioConfigCache = doc.data();
                twilioService.init(twilioConfigCache);
                console.log(`📡 [Temps Réel] Configuration Twilio mise à jour`);
            }
        }, err => console.error('🔥 Erreur listener twilio:', err.message));

        firebase.db.collection('siteConfig').doc('assets').onSnapshot(doc => {
            if (doc.exists) {
                assetsCache = doc.data();
                console.log(`📡 [Temps Réel] Assets Cloudinary mis à jour`);
            }
        }, err => console.error('🔥 Erreur listener assets:', err.message));

    } catch (err) {
        console.error('❌ Erreur lors de l\'initialisation du cache:', err);
    }
}

function getDefaultCompanyInfo() {
    return {
        name: process.env.COMPANY_NAME || "Clean Laboratoire",
        phones: [process.env.COMPANY_PHONE || "+33 1 23 45 67 89"],
        email: process.env.COMPANY_EMAIL || "contact@clean-lab.com",
        emails: [],
        address: process.env.COMPANY_ADDRESS || "Paris, France",
        whatsapp: process.env.WHATSAPP_NUMBER || "33612345678",
    };
}

// Lancer l'initialisation du cache
initializeCache();

// ============================================================================
// MIDDLEWARE DE GESTION DE LA LANGUE
// ============================================================================

app.use(async (req, res, next) => {
    // Assets et Informations entreprise globaux (disponibles partout, y compris admin)
    res.locals.assets = assetsCache;
    res.locals.getAsset = (path) => assetsCache[path] || path;
    res.locals.companyInfo = companyInfoCache || getDefaultCompanyInfo();

    // Ignorer les routes admin (ont leur propre logique pour le reste)
    if (req.path.startsWith('/admin')) return next();

    const lang = req.query.lang || req.cookies.lang || 'fr';
    const currentLang = translationsCache[lang] ? lang : 'fr';

    res.cookie('lang', currentLang, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true
    });

    // Utiliser le cache (Firestore ou fallback JSON)
    const translations = translationsCache[currentLang] || localTranslations[currentLang] || {};

    res.locals.t = translations;
    res.locals.currentLang = currentLang;
    res.locals.languages = {
        fr: 'Français', en: 'English', ar: 'العربية',
        es: 'Español', de: 'Deutsch', hi: 'हिन्दी'
    };
    res.locals.canonicalUrl = `${req.protocol}://${req.get('host')}${req.path}`;
    
    next();
});

// ============================================================================
// MIDDLEWARE SEO GLOBAL
// ============================================================================

app.use((req, res, next) => {
    if (req.path.startsWith('/admin')) return next();

    res.locals.structuredData = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": (companyInfoCache || {}).name || "Clean Laboratoire",
        "description": "Laboratoire expert en nettoyage sécurisé de billets de banque - Solutions SSD, décapage, analyses spectrophotométriques",
        "url": `https://www.clean-lab.com`,
        "telephone": (companyInfoCache || {}).phones ? (companyInfoCache.phones[0] || "") : "",
        "email": (companyInfoCache || {}).email || "",
        "areaServed": ["EU", "AF"],
        "serviceType": "Nettoyage de billets de banque",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Paris",
            "addressCountry": "FR"
        }
    };
    next();
});

// ============================================================================
// ██████╗  ██████╗ ██╗   ██╗████████╗███████╗███████╗    ██╗  ██╗ ██████╗ ██╗   ██╗████████╗███████╗███████╗
// ██╔══██╗██╔═══██╗██║   ██║╚══██╔══╝██╔════╝██╔════╝    ██║  ██║██╔═══██╗██║   ██║╚══██╔══╝██╔════╝██╔════╝
// ██████╔╝██║   ██║██║   ██║   ██║   █████╗  ███████╗    ███████║██║   ██║██║   ██║   ██║   █████╗  ███████╗
// ██╔══██╗██║   ██║██║   ██║   ██║   ██╔══╝  ╚════██║    ██╔══██║██║   ██║██║   ██║   ██║   ██╔══╝  ╚════██║
// ██║  ██║╚██████╔╝╚██████╔╝   ██║   ███████╗███████║    ██║  ██║╚██████╔╝╚██████╔╝   ██║   ███████╗███████║
// ╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚══════╝    ╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝   ╚══════╝╚══════╝
// ============================================================================

// --- GET /admin/login ---
app.get('/admin/login', (req, res) => {
    if (req.session && req.session.adminAuthenticated) {
        return res.redirect('/admin');
    }
    res.render('admin/login', {
        error: req.query.error ? decodeURIComponent(req.query.error) : null,
        prefillEmail: req.query.email || '',
    });
});

// --- POST /admin/login ---
// Utilise l'API REST Firebase Auth pour vérifier email/password
app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.redirect('/admin/login?error=' + encodeURIComponent('Email et mot de passe requis'));
    }

    try {
        // Vérification via l'API REST Firebase Auth
        const apiKey = process.env.FIREBASE_WEB_API_KEY;

        // Vérification Firebase Auth via API REST
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, returnSecureToken: true }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            const msg = data.error?.message || 'Erreur d\'authentification';
            const friendlyMsg = msg.includes('INVALID_PASSWORD') || msg.includes('INVALID_LOGIN_CREDENTIALS')
                ? 'Email ou mot de passe incorrect'
                : msg.includes('TOO_MANY_ATTEMPTS')
                    ? 'Trop de tentatives. Réessayez plus tard.'
                    : 'Erreur d\'authentification';
            return res.redirect('/admin/login?error=' + encodeURIComponent(friendlyMsg));
        }

        // Créer la session
        req.session.adminAuthenticated = true;
        req.session.adminEmail = data.email;
        req.session.adminIdToken = data.idToken;

        const returnTo = req.session.returnTo || '/admin';
        req.session.returnTo = undefined;
        return res.redirect(returnTo);

    } catch (err) {
        console.error('Login error:', err);
        return res.redirect('/admin/login?error=' + encodeURIComponent('Erreur serveur. Réessayez.'));
    }
});

// --- POST /admin/api/change-password ---
app.post('/admin/api/change-password', requireAdminAuth, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const email = req.session.adminEmail;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères' });
    }

    try {
        const apiKey = process.env.FIREBASE_WEB_API_KEY;

        // 1. Vérifier l'ancien mot de passe via l'API REST
        const verifyResponse = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: oldPassword, returnSecureToken: true }),
            }
        );

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok) {
            const msg = verifyData.error?.message || 'Erreur inconnue';
            if (msg.includes('INVALID_PASSWORD') || msg.includes('INVALID_LOGIN_CREDENTIALS')) {
                return res.status(401).json({ error: 'L\'ancien mot de passe est incorrect' });
            }
            if (msg.includes('TOO_MANY_ATTEMPTS')) {
                return res.status(429).json({ error: 'Trop de tentatives. Réessayez plus tard.' });
            }
            return res.status(401).json({ error: 'Authentification échouée' });
        }

        const uid = verifyData.localId; // ID unique Firebase Auth de l'utilisateur

        // 2. Mettre à jour le mot de passe via Admin SDK
        if (firebase.isInitialized && firebase.auth) {
            await firebase.auth.updateUser(uid, {
                password: newPassword
            });
            console.log(`Mot de passe mis à jour avec succès pour l'utilisateur: ${uid}`);
            return res.json({ success: true });
        } else {
            return res.status(500).json({ error: 'Firebase Admin SDK non initialisé.' });
        }

    } catch (err) {
        console.error('Error changing password:', err);
        return res.status(500).json({ error: 'Erreur système lors du changement de mot de passe' });
    }
});

// --- GET /admin/logout ---
app.get('/admin/logout', (req, res) => {
    // Clear session for cookie-session
    req.session = null;
    res.redirect('/admin/login');
});

// ---- Utilitaire : lire une valeur imbriquée (ex: "hero.title" → obj.hero.title) ----
function getNestedValue(obj, path) {
    if (!obj || !path) return '';
    return path.split('.').reduce((acc, k) => {
        if (acc === null || acc === undefined || typeof acc !== 'object') return '';
        return acc[k] !== undefined ? acc[k] : '';
    }, obj);
}

// ---- Utilitaire : Fusion profonde d'objets ----
function deepMerge(target, source) {
    if (!source) return target;
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
}

// ---- Utilitaire : écrire une valeur imbriquée ----
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
        cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
}

// --- GET /admin (dashboard principal) ---
app.get('/admin', requireAdminAuth, async (req, res) => {

    // Préparer le contenu pour le dashboard
    const siteContent = {};
    for (const lang of languages) {
        siteContent[lang] = translationsCache[lang] || localTranslations[lang] || {};
    }

    const cloudinaryConfig = {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
    };

    const panels = ['hero', 'features', 'about', 'abouts', 'reseau', 'services', 'contact', 'footer', 'testimonials', 'projects', 'ssd', 'machines', 'spectro', 'poudre', 'error404'];
    const panelMeta = {
        hero: { icon: 'fa-star', label: 'Section Hero', sub: 'Titre principal, sous-titre et features de la page d\' accueil' },
        features: { icon: 'fa-check-circle', label: 'Technologies & Équipements', sub: 'Section Pourquoi nous choisir / Technologies' },
        about: { icon: 'fa-users', label: 'À propos (Section)', sub: 'Section À propos sur la page d\' accueil' },
        abouts: { icon: 'fa-address-card', label: 'Page À propos', sub: 'Contenu complet de la page dédiée À propos' },
        reseau: { icon: 'fa-globe', label: 'Réseau International', sub: 'Informations sur le réseau Europe & Afrique' },
        services: { icon: 'fa-flask', label: 'Services (Accueil)', sub: 'Titres et descriptions de chaque service sur la page d\'accueil' },
        projects: { icon: 'fa-images', label: 'Réalisations / Galerie', sub: 'Titres et filtres de la page Réalisations' },
        contact: { icon: 'fa-envelope', label: 'Contact', sub: 'Textes de la page et section contact' },
        footer: { icon: 'fa-layer-group', label: 'Footer', sub: 'Texte, liens et colonnes du pied de page' },
        testimonials: { icon: 'fa-comment-dots', label: 'Témoignages', sub: 'Avis clients et titres de la section' },
        ssd: { icon: 'fa-microchip', label: 'Détails: Solution SSD', sub: 'Contenu de la page spécifique Solution SSD' },
        machines: { icon: 'fa-cogs', label: 'Détails: Machines', sub: 'Contenu de la page spécifique Location Machines' },
        spectro: { icon: 'fa-microscope', label: 'Détails: Spectrophotométrie', sub: 'Contenu de la page spécifique Analyse Spectrophotométrie' },
        poudre: { icon: 'fa-vial', label: 'Détails: Poudres', sub: 'Contenu de la page spécifique Poudres d\'Activation' },
        error404: { icon: 'fa-exclamation-triangle', label: 'Page 404', sub: 'Contenu de la page d\'erreur 404' }
    };
    const fieldSets = {
        hero: [
            { key: 'hero.title', label: 'Titre (partie 1)' },
            { key: 'hero.titleHighlight', label: 'Titre (partie surlignée)' },
            { key: 'hero.titleEnd', label: 'Titre (fin)' },
            { key: 'hero.subtitle', label: 'Sous-titre', textarea: true },
            { key: 'hero.feature1', label: 'Avantage 1' },
            { key: 'hero.feature2', label: 'Avantage 2' },
            { key: 'hero.feature3', label: 'Avantage 3' },
            { key: 'hero.feature4', label: 'Avantage 4' }
        ],
        features: [
            { key: 'feature.title', label: 'Titre (partie 1)' },
            { key: 'feature.titleHighlight', label: 'Titre (partie surlignée)' },
            { key: 'feature.experience', label: 'Expérience - Titre' },
            { key: 'feature.experienceDesc', label: 'Expérience - Desc' },
            { key: 'feature.design', label: 'Design - Titre' },
            { key: 'feature.designDesc', label: 'Design - Desc' },
            { key: 'feature.architects', label: 'Expertise - Titre' },
            { key: 'feature.architectsDesc', label: 'Expertise - Desc' },
            { key: 'feature.satisfaction', label: 'Satisfaction - Titre' },
            { key: 'feature.satisfactionDesc', label: 'Satisfaction - Desc' },
            { key: 'feature.budget', label: 'Budget - Titre' },
            { key: 'feature.budgetDesc', label: 'Budget - Desc' },
            { key: 'feature.material', label: 'Sécurité - Titre' },
            { key: 'feature.materialDesc', label: 'Sécurité - Desc' }
        ],
        about: [
            { key: 'about.title', label: 'Titre' },
            { key: 'about.description1', label: 'Description 1', textarea: true },
            { key: 'about.description2', label: 'Description 2', textarea: true },
            { key: 'about.check1', label: 'Point fort 1' },
            { key: 'about.check2', label: 'Point fort 2' },
            { key: 'about.check3', label: 'Point fort 3' },
            { key: 'about.check4', label: 'Point fort 4' }
        ],
        abouts: [
            { key: 'abouts.badge', label: 'Badge (Expertise)' },
            { key: 'abouts.title', label: 'Titre H1' },
            { key: 'abouts.description1', label: 'Description 1', textarea: true },
            { key: 'abouts.description2', label: 'Description 2', textarea: true },
            { key: 'abouts.stats.experience', label: 'Stat 1: Expérience' },
            { key: 'abouts.stats.continents', label: 'Stat 2: Continents' },
            { key: 'abouts.stats.projects', label: 'Stat 3: Projets' },
            { key: 'abouts.stats.satisfaction', label: 'Stat 4: Satisfaction' },
            { key: 'abouts.values.title', label: 'Engagement: Titre' },
            { key: 'abouts.values.subtitle', label: 'Engagement: Sous-titre' },
            { key: 'abouts.values.description', label: 'Engagement: Description', textarea: true },
            { key: 'abouts.values.security', label: 'Valeur 1: Titre' },
            { key: 'abouts.values.securityDesc', label: 'Valeur 1: Description', textarea: true },
            { key: 'abouts.values.expertise', label: 'Valeur 2: Titre' },
            { key: 'abouts.values.expertiseDesc', label: 'Valeur 2: Description', textarea: true },
            { key: 'abouts.values.speed', label: 'Valeur 3: Titre' },
            { key: 'abouts.values.speedDesc', label: 'Valeur 3: Description', textarea: true },
            { key: 'abouts.values.support', label: 'Valeur 4: Titre' },
            { key: 'abouts.values.supportDesc', label: 'Valeur 4: Description', textarea: true },
            { key: 'abouts.process.title', label: 'Processus: Titre' },
            { key: 'abouts.process.subtitle', label: 'Processus: Sous-titre' },
            { key: 'abouts.process.description', label: 'Processus: Description', textarea: true },
            { key: 'abouts.process.step1', label: 'Étape 1: Titre' },
            { key: 'abouts.process.step1Desc', label: 'Étape 1: Description', textarea: true },
            { key: 'abouts.process.step2', label: 'Étape 2: Titre' },
            { key: 'abouts.process.step2Desc', label: 'Étape 2: Description', textarea: true },
            { key: 'abouts.process.step3', label: 'Étape 3: Titre' },
            { key: 'abouts.process.step3Desc', label: 'Étape 3: Description', textarea: true },
            { key: 'abouts.process.step4', label: 'Étape 4: Titre' },
            { key: 'abouts.process.step4Desc', label: 'Étape 4: Description', textarea: true },
            { key: 'abouts.cta.title', label: 'CTA: Titre' },
            { key: 'abouts.cta.subtitle', label: 'CTA: Sous-titre' },
            { key: 'abouts.cta.description', label: 'CTA: Description', textarea: true },
            { key: 'abouts.cta.quote', label: 'CTA: Texte bouton devis' }
        ],
        reseau: [
            { key: 'reseau.title', label: 'Titre' },
            { key: 'reseau.titleHighlight', label: 'Titre Highlight' },
            { key: 'reseau.paragraph', label: 'Paragraphe', textarea: true },
            { key: 'reseau.europe', label: 'Label Europe' },
            { key: 'reseau.africa', label: 'Label Afrique' },
            { key: 'reseau.worldwide', label: 'Label International' }
        ],
        services: [
            { key: 'services.title', label: 'Titre section' },
            { key: 'services.description1', label: 'Description générale 1', textarea: true },
            { key: 'services.description2', label: 'Description générale 2', textarea: true },
            { key: 'services.additionalTitle1', label: 'Service 1 — Titre' },
            { key: 'services.interiorDesc1', label: 'Service 1 — Description', textarea: true },
            { key: 'services.additionalTitle2', label: 'Service 2 — Titre' },
            { key: 'services.interiorDesc2', label: 'Service 2 — Description', textarea: true },
            { key: 'services.additionalTitle3', label: 'Service 3 — Titre' },
            { key: 'services.interiorDesc3', label: 'Service 3 — Description', textarea: true },
            { key: 'services.additionalTitle4', label: 'Service 4 — Titre' },
            { key: 'services.interiorDesc4', label: 'Service 4 — Description', textarea: true },
            { key: 'services.phoneNum', label: 'Numéro de téléphone (Accueil)' },
            { key: 'services.phone', label: 'Texte appel à l\' action téléphone' }
        ],
        contact: [
            { key: 'contact.title', label: 'Titre (partie 1)' },
            { key: 'contact.titleHighlight', label: 'Titre (partie surlignée)' },
            { key: 'contact.description', label: 'Description', textarea: true }
        ],
        footer: [
            { key: 'footer.title', label: 'Texte footer principal', textarea: true },
            { key: 'footer.service1', label: 'Service 1' },
            { key: 'footer.service2', label: 'Service 2' },
            { key: 'footer.service3', label: 'Service 3' },
            { key: 'footer.service4', label: 'Service 4' }
        ],
        projects: [
            { key: 'projects.hero.title1', label: 'Hero: Titre 1' },
            { key: 'projects.hero.titleHighlight', label: 'Hero: Titre Highlight' },
            { key: 'projects.hero.title2', label: 'Hero: Titre 2' },
            { key: 'projects.hero.subtitle', label: 'Hero: Sous-titre', textarea: true },
            { key: 'projects.filters.all', label: 'Filtre: Tout' },
            { key: 'projects.filters.ssd', label: 'Filtre: SSD' },
            { key: 'projects.filters.machines', label: 'Filtre: Machines' },
            { key: 'projects.filters.powder', label: 'Filtre: Poudre' }
        ],
        testimonials: [
            { key: 'testimonials.title', label: 'Titre section' },
            { key: 'testimonials.subtitle', label: 'Sous-titre section' },
            { key: 'testimonials.client1.text', label: 'Client 1 — Texte', textarea: true },
            { key: 'testimonials.client1.name', label: 'Client 1 — Nom' },
            { key: 'testimonials.client1.role', label: 'Client 1 — Rôle' },
            { key: 'testimonials.client2.text', label: 'Client 2 — Texte', textarea: true },
            { key: 'testimonials.client2.name', label: 'Client 2 — Nom' },
            { key: 'testimonials.client2.role', label: 'Client 2 — Rôle' },
            { key: 'testimonials.client3.text', label: 'Client 3 — Texte', textarea: true },
            { key: 'testimonials.client3.name', label: 'Client 3 — Nom' },
            { key: 'testimonials.client3.role', label: 'Client 3 — Rôle' }
        ],
        ssd: [
            { key: "service_details.solution-ssd-universelle-nettoyage.hero.title", label: "Hero: Titre" },
            { key: "service_details.solution-ssd-universelle-nettoyage.hero.titleHighlight", label: "Hero: Titre Highlight" },
            { key: "service_details.solution-ssd-universelle-nettoyage.hero.subtitle", label: "Hero: Sous-titre", textarea: true },
            { key: "service_details.solution-ssd-universelle-nettoyage.content.title", label: "Contenu: Titre" },
            { key: "service_details.solution-ssd-universelle-nettoyage.content.description", label: "Contenu: Description", textarea: true },
            { key: "service_details.solution-ssd-universelle-nettoyage.video.title", label: "Vidéo: Titre" },
            { key: "service_details.solution-ssd-universelle-nettoyage.video.caption", label: "Vidéo: Légende" },
            { key: "service_details.solution-ssd-universelle-nettoyage.sidebar.title", label: "Sidebar: Titre" },
            { key: "service_details.solution-ssd-universelle-nettoyage.sidebar.call", label: "Sidebar: Texte Appel" },
            { key: "service_details.solution-ssd-universelle-nettoyage.sidebar.whatsapp", label: "Sidebar: Texte WhatsApp" },
            { key: "service_details.solution-ssd-universelle-nettoyage.sidebar.email", label: "Sidebar: Texte Email" },
            { key: "service_details.solution-ssd-universelle-nettoyage.cta.title", label: "CTA Bottom: Titre" },
            { key: "service_details.solution-ssd-universelle-nettoyage.cta.subtitle", label: "CTA Bottom: Sous-titre" },
            { key: "service_details.solution-ssd-universelle-nettoyage.cta.button", label: "Bouton CTA principal" },
            { key: "service_details.solution-ssd-universelle-nettoyage.testimonial.text", label: "Témoignage: Texte", textarea: true },
            { key: "service_details.solution-ssd-universelle-nettoyage.testimonial.author", label: "Témoignage: Auteur" }
        ],
        machines: [
            { key: "service_details.location-machines-decapage.hero.title", label: "Hero: Titre" },
            { key: "service_details.location-machines-decapage.hero.titleHighlight", label: "Hero: Titre Highlight" },
            { key: "service_details.location-machines-decapage.hero.subtitle", label: "Hero: Sous-titre", textarea: true },
            { key: "service_details.location-machines-decapage.content.title", label: "Contenu: Titre" },
            { key: "service_details.location-machines-decapage.content.description", label: "Contenu: Description", textarea: true },
            { key: "service_details.location-machines-decapage.video.title", label: "Vidéo: Titre" },
            { key: "service_details.location-machines-decapage.video.caption", label: "Vidéo: Légende" },
            { key: "service_details.location-machines-decapage.sidebar.title", label: "Sidebar: Titre" },
            { key: "service_details.location-machines-decapage.sidebar.call", label: "Sidebar: Texte Appel" },
            { key: "service_details.location-machines-decapage.sidebar.whatsapp", label: "Sidebar: Texte WhatsApp" },
            { key: "service_details.location-machines-decapage.sidebar.email", label: "Sidebar: Texte Email" },
            { key: "service_details.location-machines-decapage.cta.title", label: "CTA Bottom: Titre" },
            { key: "service_details.location-machines-decapage.cta.subtitle", label: "CTA Bottom: Sous-titre" },
            { key: "service_details.location-machines-decapage.cta.button", label: "Bouton CTA principal" },
            { key: "service_details.location-machines-decapage.testimonial.text", label: "Témoignage: Texte", textarea: true },
            { key: "service_details.location-machines-decapage.testimonial.author", label: "Témoignage: Auteur" }
        ],
        spectro: [
            { key: "service_details.analyse-spectrophotometrie-billets.hero.title", label: "Hero: Titre" },
            { key: "service_details.analyse-spectrophotometrie-billets.hero.titleHighlight", label: "Hero: Titre Highlight" },
            { key: "service_details.analyse-spectrophotometrie-billets.hero.subtitle", label: "Hero: Sous-titre", textarea: true },
            { key: "service_details.analyse-spectrophotometrie-billets.content.title", label: "Contenu: Titre" },
            { key: "service_details.analyse-spectrophotometrie-billets.content.description", label: "Contenu: Description", textarea: true },
            { key: "service_details.analyse-spectrophotometrie-billets.video.title", label: "Vidéo: Titre" },
            { key: "service_details.analyse-spectrophotometrie-billets.video.caption", label: "Vidéo: Légende" },
            { key: "service_details.analyse-spectrophotometrie-billets.sidebar.title", label: "Sidebar: Titre" },
            { key: "service_details.analyse-spectrophotometrie-billets.sidebar.call", label: "Sidebar: Texte Appel" },
            { key: "service_details.analyse-spectrophotometrie-billets.sidebar.whatsapp", label: "Sidebar: Texte WhatsApp" },
            { key: "service_details.analyse-spectrophotometrie-billets.sidebar.email", label: "Sidebar: Texte Email" },
            { key: "service_details.analyse-spectrophotometrie-billets.cta.title", label: "CTA Bottom: Titre" },
            { key: "service_details.analyse-spectrophotometrie-billets.cta.subtitle", label: "CTA Bottom: Sous-titre" },
            { key: "service_details.analyse-spectrophotometrie-billets.cta.button", label: "Bouton CTA principal" },
            { key: "service_details.analyse-spectrophotometrie-billets.testimonial.text", label: "Témoignage: Texte", textarea: true },
            { key: "service_details.analyse-spectrophotometrie-billets.testimonial.author", label: "Témoignage: Auteur" }
        ],
        poudre: [
            { key: "service_details.poudre-activation-nettoyage.hero.title", label: "Hero: Titre" },
            { key: "service_details.poudre-activation-nettoyage.hero.titleHighlight", label: "Hero: Titre Highlight" },
            { key: "service_details.poudre-activation-nettoyage.hero.subtitle", label: "Hero: Sous-titre", textarea: true },
            { key: "service_details.poudre-activation-nettoyage.content.title", label: "Contenu: Titre" },
            { key: "service_details.poudre-activation-nettoyage.content.description", label: "Contenu: Description", textarea: true },
            { key: "service_details.poudre-activation-nettoyage.video.title", label: "Vidéo: Titre" },
            { key: "service_details.poudre-activation-nettoyage.video.caption", label: "Vidéo: Légende" },
            { key: "service_details.poudre-activation-nettoyage.sidebar.title", label: "Sidebar: Titre" },
            { key: "service_details.poudre-activation-nettoyage.sidebar.call", label: "Sidebar: Texte Appel" },
            { key: "service_details.poudre-activation-nettoyage.sidebar.whatsapp", label: "Sidebar: Texte WhatsApp" },
            { key: "service_details.poudre-activation-nettoyage.sidebar.email", label: "Sidebar: Texte Email" },
            { key: "service_details.poudre-activation-nettoyage.cta.title", label: "CTA Bottom: Titre" },
            { key: "service_details.poudre-activation-nettoyage.cta.subtitle", label: "CTA Bottom: Sous-titre" },
            { key: "service_details.poudre-activation-nettoyage.cta.button", label: "Bouton CTA principal" },
            { key: "service_details.poudre-activation-nettoyage.testimonial.text", label: "Témoignage: Texte", textarea: true },
            { key: "service_details.poudre-activation-nettoyage.testimonial.author", label: "Témoignage: Auteur" }
        ],
        error404: [
            { key: 'error404.title', label: '404' },
            { key: 'error404.titleHighlight', label: 'Page Non Trouvée' },
            { key: 'error404.subtitle', label: 'Sous-titre', textarea: true },
            { key: 'error404.cta.button', label: 'Texte Bouton' }
        ]
    };

    const langFlags = {
        fr: '🇫🇷 FR',
        en: '🇬🇧 EN',
        ar: '🇸🇦 AR',
        es: '🇪🇸 ES',
        de: '🇩🇪 DE',
        hi: '🇮🇳 HI'
    };

    const langNames = {
        fr: 'Français',
        en: 'English',
        ar: 'العربية',
        es: 'Español',
        de: 'Deutsch',
        hi: 'हिन्दी'
    };

    res.render('admin/dashboard', {
        page: 'dashboard',
        siteContent,
        langs: languages,
        langFlags,
        langNames,
        panels,
        panelMeta,
        fieldSets,
        companyInfo: companyInfoCache || {},
        twilioConfig: twilioConfigCache || {},
        cloudinaryConfig,
        adminEmail: req.session.adminEmail,
        getNestedValue, // Passer la fonction au template EJS
    });
});

// --- POST /admin/api/company-info ---
app.post('/admin/api/company-info', requireAdminAuth, async (req, res) => {
    const { name, phones, whatsapp, email, address, emails } = req.body;

    const data = {
        name: name || '',
        phones: phones || [],
        whatsapp: whatsapp || '',
        email: email || '',
        emails: emails || [],
        address: address || '',
        updatedAt: new Date().toISOString(),
    };

    if (firebase.isInitialized && firebase.db) {
        try {
            await firebase.db.collection('siteConfig').doc('companyInfo').set(data, { merge: true });
            // onSnapshot se charge de mettre à jour le cache automatiquement
            return res.json({ success: true });
        } catch (err) {
            console.error('Error saving companyInfo:', err);
            return res.status(500).json({ error: 'Erreur Firestore: ' + err.message });
        }
    } else {
        // Mise à jour en mémoire uniquement (sans Firebase)
        companyInfoCache = { ...companyInfoCache, ...data };
        return res.json({ success: true, warning: 'Firebase non configuré — changements non persistants' });
    }
});

// --- POST /admin/api/content/:lang ---
// Sauvegarde une ou plusieurs clés pour une langue donnée
app.post('/admin/api/content/:lang', requireAdminAuth, async (req, res) => {
    const { lang } = req.params;
    const { section, data } = req.body;

    if (!languages.includes(lang)) {
        return res.status(400).json({ error: 'Langue non supportée' });
    }

    if (!section || !data) {
        return res.status(400).json({ error: 'section et data requis' });
    }

    if (firebase.isInitialized && firebase.db) {
        try {
            // Mise à jour partielle par section (merge = true pour ne pas écraser tout le doc)
            const updatePayload = {};
            // Aplatir les clés imbriquées pour Firestore (dot notation)
            function flattenForFirestore(obj, prefix) {
                for (const key of Object.keys(obj)) {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        flattenForFirestore(obj[key], fullKey);
                    } else {
                        updatePayload[fullKey] = obj[key];
                    }
                }
            }
            flattenForFirestore(data, '');

            await firebase.db.collection('siteContent').doc(lang).update(updatePayload);
            // onSnapshot se charge de mettre à jour le cache automatiquement
            return res.json({ success: true });
        } catch (err) {
            console.error('Error saving content:', err);
            return res.status(500).json({ error: 'Erreur Firestore: ' + err.message });
        }
    } else {
        // Mode sans Firebase : mise à jour du cache en mémoire
        if (!translationsCache[lang]) translationsCache[lang] = {};
        const mergeFn = (target, src) => {
            for (const k of Object.keys(src)) {
                if (typeof src[k] === 'object' && src[k] !== null && !Array.isArray(src[k])) {
                    if (!target[k]) target[k] = {};
                    mergeFn(target[k], src[k]);
                } else {
                    target[k] = src[k];
                }
            }
        };
        mergeFn(translationsCache[lang], data);
        return res.json({ success: true, warning: 'Firebase non configuré — changements non persistants' });
    }
});

// --- POST /admin/api/twilio-config ---
app.post('/admin/api/twilio-config', requireAdminAuth, async (req, res) => {
    const { recipients } = req.body;

    const data = {
        recipients: recipients || [],
        updatedAt: new Date().toISOString(),
    };

    if (firebase.isInitialized && firebase.db) {
        try {
            await firebase.db.collection('siteConfig').doc('twilio').set(data, { merge: true });
            return res.json({ success: true });
        } catch (err) {
            console.error('Error saving twilioConfig:', err);
            return res.status(500).json({ error: 'Erreur Firestore: ' + err.message });
        }
    } else {
        twilioConfigCache = { ...twilioConfigCache, ...data };
        return res.json({ success: true, warning: 'Firebase non configuré — changements non persistants' });
    }
});

// --- POST /admin/api/update-assets ---
app.post('/admin/api/update-assets', requireAdminAuth, async (req, res) => {
    const { assets } = req.body;

    if (!assets || typeof assets !== 'object') {
        return res.status(400).json({ error: 'assets requis' });
    }

    if (firebase.isInitialized && firebase.db) {
        try {
            await firebase.db.collection('siteConfig').doc('assets').set(assets, { merge: true });
            return res.json({ success: true });
        } catch (err) {
            console.error('Error saving assets:', err);
            return res.status(500).json({ error: 'Erreur Firestore: ' + err.message });
        }
    } else {
        assetsCache = { ...assetsCache, ...assets };
        return res.json({ success: true, warning: 'Firebase non configuré — changements non persistants' });
    }
});

// --- GET /admin/api/messages ---
app.get('/admin/api/messages', requireAdminAuth, async (req, res) => {
    if (!firebase.isInitialized || !firebase.db) {
        return res.json([]);
    }
    try {
        const snapshot = await firebase.db.collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        const messages = [];
        snapshot.forEach(doc => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        return res.json(messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        return res.status(500).json({ error: 'Erreur Firestore' });
    }
});

// --- POST /admin/api/messages/:id/status ---
app.post('/admin/api/messages/:id/status', requireAdminAuth, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!firebase.isInitialized || !firebase.db) {
        return res.status(500).json({ error: 'Firestore non configuré' });
    }
    try {
        await firebase.db.collection('messages').doc(id).update({ status });
        return res.json({ success: true });
    } catch (err) {
        console.error('Error updating message status:', err);
        return res.status(500).json({ error: 'Erreur Firestore' });
    }
});

// --- DELETE /admin/api/messages/:id ---
app.delete('/admin/api/messages/:id', requireAdminAuth, async (req, res) => {
    const { id } = req.params;
    if (!firebase.isInitialized || !firebase.db) {
        return res.status(500).json({ error: 'Firestore non configuré' });
    }
    try {
        await firebase.db.collection('messages').doc(id).delete();
        return res.json({ success: true });
    } catch (err) {
        console.error('Error deleting message:', err);
        return res.status(500).json({ error: 'Erreur Firestore' });
    }
});

// ============================================================================
// ROUTES PRINCIPALES OPTIMISÉES POUR LE SEO
// ============================================================================

app.get('/', (req, res) => {
    const metaData = {
        title: "Clean Laboratoire | Expert Nettoyage & Décapage Billets de Banque Sécurisé",
        description: "Laboratoire Clean-Lab leader en Europe et Afrique. Solutions professionnelles de nettoyage, décapage et analyse de billets. Technologies SSD et spectrophotométrie.",
        keywords: "nettoyage billets, décapage billets, solution SSD, laboratoire nettoyage, spectrophotométrie, billets de banque",
        canonical: "/"
    };
    res.render('index', { title: metaData.title, meta: metaData, page: 'home' });
});

app.get('/a-propos-laboratoire-nettoyage-billets', (req, res) => {
    const metaData = {
        title: "À Propos de Clean Laboratoire | Expert Nettoyage Billets Depuis 10 Ans",
        description: "Découvrez Clean Laboratoire, laboratoire expert en nettoyage sécurisé de billets. 10 ans d'expertise, technologies de pointe, réseau international Europe-Afrique.",
        keywords: "à propos clean lab, expertise nettoyage billets, laboratoire spécialisé, historique entreprise",
        canonical: "/a-propos-laboratoire-nettoyage-billets"
    };
    res.render('about', { title: metaData.title, meta: metaData, page: 'about' });
});

app.get('/about', (req, res) => res.redirect(301, '/a-propos-laboratoire-nettoyage-billets'));

app.get('/services-nettoyage-decapage-billets', (req, res) => {
    const metaData = {
        title: "Services Nettoyage Billets | Solutions SSD & Décapage Professionnel",
        description: "Services complets de nettoyage et décapage de billets. Solution SSD universelle, location machines, analyses spectrophotométriques, poudres d'activation.",
        keywords: "services nettoyage billets, solution SSD, location machines décapage, analyse spectrophotométrie",
        canonical: "/services-nettoyage-decapage-billets"
    };
    res.render('service', { title: metaData.title, meta: metaData, page: 'service' });
});

app.get('/service', (req, res) => res.redirect(301, '/services-nettoyage-decapage-billets'));

app.get('/tarifs-solutions-nettoyage-billets', (req, res) => {
    const metaData = {
        title: "Tarifs Nettoyage Billets | Solutions Professionnelles - Clean Laboratoire",
        description: "Tarifs transparents pour nos services de nettoyage de billets. Devis gratuit, solutions sur mesure, prix compétitifs pour particuliers et professionnels.",
        keywords: "tarifs nettoyage billets, prix solution SSD, devis nettoyage billets, coût décapage",
        canonical: "/tarifs-solutions-nettoyage-billets"
    };
    res.render('price', { title: metaData.title, meta: metaData, page: 'price' });
});

app.get('/price', (req, res) => res.redirect(301, '/tarifs-solutions-nettoyage-billets'));

app.get('/contact-laboratoire-nettoyage', (req, res) => {
    const metaData = {
        title: "Contact Clean Laboratoire | Expert Nettoyage Billets - Devis Gratuit",
        description: "Contactez Clean Laboratoire pour un devis gratuit. Expert en nettoyage de billets, solutions SSD, décapage sécurisé. Europe et Afrique.",
        keywords: "contact clean lab, devis nettoyage billets, expert SSD, laboratoire contact",
        canonical: "/contact-laboratoire-nettoyage"
    };
    res.render('contact', { title: metaData.title, meta: metaData, page: 'contact' });
});

app.get('/contact', (req, res) => res.redirect(301, '/contact-laboratoire-nettoyage'));

// ============================================================================
// SOUS-PAGES SERVICES DÉTAILLÉES
// ============================================================================

app.get('/service/solution-ssd-universelle-nettoyage', (req, res) => {
    res.render('service-ssd', {
        title: "Solution SSD Universelle | Nettoyage Professionnel Billets - Clean Lab",
        meta: {
            description: "Solution SSD universelle pour le nettoyage efficace de tous types de billets.",
            keywords: "solution SSD universelle, nettoyage billets SSD",
            canonical: "/service/solution-ssd-universelle-nettoyage"
        },
        page: 'service'
    });
});

app.get('/service/location-machines-decapage', (req, res) => {
    res.render('service-machines', {
        title: "Location Machines Décapage | Équipements Professionnels Billets",
        meta: {
            description: "Location de machines de décapage haute performance.",
            keywords: "location machine décapage, équipement nettoyage billets",
            canonical: "/service/location-machines-decapage"
        },
        page: 'service'
    });
});

app.get('/service/analyse-spectrophotometrie-billets', (req, res) => {
    res.render('analyse-spectrophotometrie', {
        title: "Analyse Spectrophotométrie Billets | Clean Laboratoire",
        meta: {
            description: "Analyse spectrophotométrique des billets pour un nettoyage optimal.",
            keywords: "analyse spectrophotométrie billets",
            canonical: "/service/analyse-spectrophotometrie-billets"
        },
        page: 'service'
    });
});

app.get('/service/poudre-activation-nettoyage', (req, res) => {
    res.render('poudre-activation-nettoyage', {
        title: "Poudre d'Activation Nettoyage Billets | Clean Laboratoire",
        meta: {
            description: "Poudre d'activation innovante pour améliorer le nettoyage des billets.",
            keywords: "poudre activation nettoyage",
            canonical: "/service/poudre-activation-nettoyage"
        },
        page: 'service'
    });
});

// ============================================================================
// PAGES SECONDAIRES
// ============================================================================

app.get('/realisations-nettoyage-billets', (req, res) => {
    res.render('project', {
        title: "Réalisations Nettoyage Billets | Projets Clean Laboratoire",
        meta: {
            description: "Découvrez nos réalisations en nettoyage et décapage de billets.",
            keywords: "réalisations nettoyage billets",
            canonical: "/realisations-nettoyage-billets"
        },
        page: 'project'
    });
});

app.get('/project', (req, res) => res.redirect(301, '/realisations-nettoyage-billets'));

app.get('/equipe-experts-nettoyage-billets', (req, res) => {
    res.render('team', {
        title: "Notre Équipe d'Experts | Clean Laboratoire - Nettoyage Billets",
        meta: {
            description: "Découvrez notre équipe d'experts qualifiés en nettoyage et décapage de billets. Plus de 10 ans d'expertise à votre service.",
            keywords: "équipe experts, techniciens nettoyage billets, laboratoire clean lab",
            canonical: "/equipe-experts-nettoyage-billets"
        },
        page: 'pages'
    });
});

app.get('/temoignages-clients-clean-lab', (req, res) => {
    res.render('testimonials', {
        title: "Témoignages Clients | Clean Laboratoire - Résultats Garantis",
        meta: {
            description: "Découvrez les avis et témoignages de nos clients satisfaits. Résultats concrets en nettoyage et décapage de billets sécurisé.",
            keywords: "témoignages clients, avis clean laboratoire, résultats nettoyage billets",
            canonical: "/temoignages-clients-clean-lab"
        },
        page: 'pages'
    });
});

app.get('/technologies-equipements-nettoyage', (req, res) => {
    res.render('feature', {
        title: "Technologies & Équipements Nettoyage Billets | Clean Laboratoire",
        meta: {
            description: "Découvrez nos technologies de pointe.",
            keywords: "technologies nettoyage billets",
            canonical: "/technologies-equipements-nettoyage"
        },
        page: 'feature'
    });
});

app.get('/feature', (req, res) => res.redirect(301, '/technologies-equipements-nettoyage'));

app.get('/blog-expertise-nettoyage-billets', (req, res) => {
    res.render('blog', {
        title: "Blog Expertise Nettoyage Billets | Conseils & Actualités Clean Lab",
        meta: {
            description: "Blog expert sur le nettoyage et décapage de billets.",
            keywords: "blog nettoyage billets",
            canonical: "/blog-expertise-nettoyage-billets"
        },
        page: 'pages'
    });
});

app.get('/blog', (req, res) => res.redirect(301, '/blog-expertise-nettoyage-billets'));

// ============================================================================
// SITEMAP.XML DYNAMIQUE
// ============================================================================

app.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.DOMAIN || 'https://www.clean-lab.com';
    const urls = [
        { url: '/', changefreq: 'daily', priority: '1.0' },
        { url: '/a-propos-laboratoire-nettoyage-billets', changefreq: 'monthly', priority: '0.9' },
        { url: '/services-nettoyage-decapage-billets', changefreq: 'weekly', priority: '0.9' },
        { url: '/tarifs-solutions-nettoyage-billets', changefreq: 'monthly', priority: '0.8' },
        { url: '/contact-laboratoire-nettoyage', changefreq: 'monthly', priority: '0.8' },
        { url: '/service/solution-ssd-universelle-nettoyage', changefreq: 'weekly', priority: '0.7' },
        { url: '/service/location-machines-decapage', changefreq: 'weekly', priority: '0.7' },
        { url: '/realisations-nettoyage-billets', changefreq: 'monthly', priority: '0.6' },
        { url: '/technologies-equipements-nettoyage', changefreq: 'monthly', priority: '0.6' },
        { url: '/equipe-experts-nettoyage-billets', changefreq: 'monthly', priority: '0.5' },
        { url: '/temoignages-clients-clean-lab', changefreq: 'monthly', priority: '0.5' },
        { url: '/blog-expertise-nettoyage-billets', changefreq: 'weekly', priority: '0.5' }
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    urls.forEach(item => {
        xml += `\n    <url>\n        <loc>${baseUrl}${item.url}</loc>\n        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n        <changefreq>${item.changefreq}</changefreq>\n        <priority>${item.priority}</priority>\n    </url>`;
    });
    xml += '\n</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
});

// ============================================================================
// ROBOTS.TXT
// ============================================================================

app.get('/robots.txt', (req, res) => {
    const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /admin

Sitemap: ${process.env.DOMAIN || 'https://www.clean-lab.com'}/sitemap.xml

Crawl-delay: 1`;
    res.type('text/plain');
    res.send(robots);
});

// ============================================================================
// ROUTES EXISTANTES (COMPATIBILITÉ)
// ============================================================================

app.get('/detail', (req, res) => res.render('detail', { title: 'Blog Detail', page: 'pages' }));
app.get('/team', (req, res) => res.redirect(301, '/equipe-experts-nettoyage-billets'));
app.get('/testimonial', (req, res) => res.redirect(301, '/temoignages-clients-clean-lab'));
app.get('/testimonials', (req, res) => res.redirect(301, '/temoignages-clients-clean-lab'));
app.get('/appointment', (req, res) => res.render('appointment', { title: 'Appointment', page: 'pages' }));

// ============================================================================
// GESTION DES ERREURS
// ============================================================================

app.get('/404', (req, res) => {
    res.render('404', { title: 'Page Non Trouvée - Clean Laboratoire', page: '' });
});

// NOTE: 404 catch-all moved to the end

// ============================================================================
// GESTION DES FORMULAIRES (CONTACT / DEVIS)
// ============================================================================

app.post('/contact/send', async (req, res) => {
    const { name, email, phone, service, subject, message } = req.body;

    // 1. Logique métier : préparer le message WhatsApp
    const whatsappBody = `*NOUVELLE DEMANDE DE CONTACT*
---
*Nom:* ${name || 'N/A'}
*Email:* ${email || 'N/A'}
*Tél:* ${phone || 'N/A'}
*Service:* ${service || 'Général'}
*Sujet:* ${subject || 'Aucun'}

*Message:*
${message || 'Aucun message.'}
---
_Source: Site Clean-Lab_`;

    // 2. Envoyer via Twilio (si configuré)
    let whatsappStatus = 'skipped';
    if (twilioConfigCache && twilioConfigCache.recipients && twilioConfigCache.recipients.length > 0) {
        const result = await twilioService.sendWhatsApp(twilioConfigCache.recipients, whatsappBody);
        whatsappStatus = result.success ? 'sent' : 'failed';
    }

    // 3. Enregistrer le message dans Firestore
    let dbStatus = 'skipped';
    if (firebase.isInitialized && firebase.db) {
        try {
            await firebase.db.collection('messages').add({
                name: name || '',
                email: email || '',
                phone: phone || '',
                service: service || 'Général',
                subject: subject || 'Aucun',
                message: message || '',
                whatsappStatus: whatsappStatus,
                status: 'new', // new, read, replied
                createdAt: new Date().toISOString()
            });
            dbStatus = 'saved';
            console.log('✅ Nouveau message enregistré dans Firestore');
        } catch (err) {
            dbStatus = 'failed';
            console.error('❌ Erreur lors de l\'enregistrement du message dans Firestore:', err);
        }
    }

    // 4. Répondre avec JSON (AJAX) ou rediriger selon le type de requête
    const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');
    if (wantsJson || req.xhr) {
        return res.json({ success: true, whatsappStatus, dbStatus });
    }
    res.redirect(`/contact-laboratoire-nettoyage?success=true`);
});

// ============================================================================
// 404 CATCH-ALL (MUST BE LAST ROUTE)
// ============================================================================

app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Non Trouvée - Clean Laboratoire', page: '' });
});

// ============================================================================
// DÉMARRAGE DU SERVEUR
// ============================================================================

app.listen(PORT, () => {
    console.log(`
🚀 SERVEUR CLEAN LABORATOIRE DÉMARRÉ
📍 Port: ${PORT}
🔒 Admin Dashboard: http://localhost:${PORT}/admin
🌍 Langue par défaut : Français
📚 Langues disponibles : ${languages.join(', ')}
🔥 Firebase: ${firebase.isInitialized ? '✅ Connecté' : '⚠️  Non configuré (fallback JSON local)'}

📈 FONCTIONNALITÉS:
✅ Dashboard admin /admin (protégé par session)
✅ Contenu chargé depuis Firestore (avec cache 5 min)
✅ Fallback JSON local si Firebase indisponible
✅ URLs optimisées SEO + redirections 301
✅ Sitemap XML dynamique + Robots.txt
✅ Multilinguisme 6 langues
    `);
});