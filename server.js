// ============================================================================
// IMPORTS ET CONFIGURATION DE BASE
// ============================================================================

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARES ESSENTIELS
// ============================================================================

// Middleware pour parser les données des formulaires
app.use(express.urlencoded({ extended: true }));
// Middleware pour parser les données JSON
app.use(express.json());
// Middleware pour gérer les cookies
app.use(cookieParser());

// ============================================================================
// CONFIGURATION DU MOTEUR DE TEMPLATE EJS
// ============================================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================================================
// SERVIR LES FICHIERS STATIQUES AVEC CACHE OPTIMISÉ
// ============================================================================

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1y', // Cache longue durée pour les assets
    etag: false   // Désactive ETag pour meilleures performances
}));

// ============================================================================
// CHARGEMENT DES TRADUCTIONS
// ============================================================================

const translations = {};
const localesDir = path.join(__dirname, 'locales');
const languages = ['fr', 'en', 'ar', 'es', 'de', 'hi'];

// MODIFIEZ ICI : Vérifiez que tous vos fichiers de traduction existent
languages.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    if (fs.existsSync(filePath)) {
        translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
        console.warn(`⚠️ Fichier de traduction manquant: ${filePath}`);
    }
});

// ============================================================================
// MIDDLEWARE DE GESTION DE LA LANGUE AVANCÉ
// ============================================================================

app.use((req, res, next) => {
    // Récupérer la langue depuis: 1) query param, 2) cookie, 3) défaut = FRANÇAIS
    const lang = req.query.lang || req.cookies.lang || 'fr';
    
    // Vérifier si la langue existe, sinon utiliser le français
    const currentLang = translations[lang] ? lang : 'fr';
    
    // Stocker dans un cookie pour 30 jours
    res.cookie('lang', currentLang, { 
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true // Sécurisé
    });
    
    // MODIFIEZ ICI : Ajoutez vos informations d'entreprise
    res.locals.companyInfo = {
        name: "Clean Laboratoire",
        phone: "+33 1 23 45 67 89", // MODIFIEZ avec votre vrai numéro
        email: "contact@clean-lab.com", // MODIFIEZ avec votre email
        address: "Paris, France", // MODIFIEZ avec votre adresse
        whatsapp: "33612345678" // MODIFIEZ avec votre numéro WhatsApp
    };
    
    // Ajouter les traductions et la langue actuelle à res.locals
    res.locals.t = translations[currentLang];
    res.locals.currentLang = currentLang;
    res.locals.languages = {
        fr: 'Français',
        en: 'English',
        ar: 'العربية',
        es: 'Español',
        de: 'Deutsch',
        hi: 'हिन्दी'
    };
    
    // URL canonique pour le SEO
    res.locals.canonicalUrl = `${req.protocol}://${req.get('host')}${req.path}`;
    
    next();
});

// ============================================================================
// MIDDLEWARE SEO GLOBAL - DONNÉES STRUCTURÉES
// ============================================================================

app.use((req, res, next) => {
    // MODIFIEZ ICI : Données structurées Schema.org pour votre entreprise
    res.locals.structuredData = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": "Clean Laboratoire",
        "description": "Laboratoire expert en nettoyage sécurisé de billets de banque - Solutions SSD, décapage, analyses spectrophotométriques",
        "url": `https://www.clean-lab.com`,
        "telephone": "+33-1-23-45-67-89", // MODIFIEZ
        "email": "contact@clean-lab.com", // MODIFIEZ
        "areaServed": ["EU", "AF"],
        "serviceType": "Nettoyage de billets de banque",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Paris", // MODIFIEZ
            "addressCountry": "FR" // MODIFIEZ
        }
    };
    
    next();
});

// ============================================================================
// ROUTES PRINCIPALES OPTIMISÉES POUR LE SEO
// ============================================================================

// MODIFIEZ ICI : Page d'accueil - LA PLUS IMPORTANTE POUR LE SEO
app.get('/', (req, res) => {
    const metaData = {
        title: "Clean Laboratoire | Expert Nettoyage & Décapage Billets de Banque Sécurisé",
        description: "Laboratoire Clean-Lab leader en Europe et Afrique. Solutions professionnelles de nettoyage, décapage et analyse de billets. Technologies SSD et spectrophotométrie.",
        keywords: "nettoyage billets, décapage billets, solution SSD, laboratoire nettoyage, spectrophotométrie, billets de banque",
        canonical: "/"
    };
    
    res.render('index', { 
        title: metaData.title,
        meta: metaData,
        page: 'home'
    });
});

// MODIFIEZ ICI : Page À propos optimisée
app.get('/a-propos-laboratoire-nettoyage-billets', (req, res) => {
    const metaData = {
        title: "À Propos de Clean Laboratoire | Expert Nettoyage Billets Depuis 10 Ans",
        description: "Découvrez Clean Laboratoire, laboratoire expert en nettoyage sécurisé de billets. 10 ans d'expertise, technologies de pointe, réseau international Europe-Afrique.",
        keywords: "à propos clean lab, expertise nettoyage billets, laboratoire spécialisé, historique entreprise",
        canonical: "/a-propos-laboratoire-nettoyage-billets"
    };
    
    res.render('about', { 
        title: metaData.title,
        meta: metaData,
        page: 'about'
    });
});

// Redirection 301 pour l'ancienne URL /about
app.get('/about', (req, res) => {
    res.redirect(301, '/a-propos-laboratoire-nettoyage-billets');
});

// MODIFIEZ ICI : Page Services optimisée
app.get('/services-nettoyage-decapage-billets', (req, res) => {
    const metaData = {
        title: "Services Nettoyage Billets | Solutions SSD & Décapage Professionnel",
        description: "Services complets de nettoyage et décapage de billets. Solution SSD universelle, location machines, analyses spectrophotométriques, poudres d'activation.",
        keywords: "services nettoyage billets, solution SSD, location machines décapage, analyse spectrophotométrie",
        canonical: "/services-nettoyage-decapage-billets"
    };
    
    res.render('service', { 
        title: metaData.title,
        meta: metaData,
        page: 'service'
    });
});

// Redirection 301 pour l'ancienne URL /service
app.get('/service', (req, res) => {
    res.redirect(301, '/services-nettoyage-decapage-billets');
});

// MODIFIEZ ICI : Page Tarifs optimisée
app.get('/tarifs-solutions-nettoyage-billets', (req, res) => {
    const metaData = {
        title: "Tarifs Nettoyage Billets | Solutions Professionnelles - Clean Laboratoire",
        description: "Tarifs transparents pour nos services de nettoyage de billets. Devis gratuit, solutions sur mesure, prix compétitifs pour particuliers et professionnels.",
        keywords: "tarifs nettoyage billets, prix solution SSD, devis nettoyage billets, coût décapage",
        canonical: "/tarifs-solutions-nettoyage-billets"
    };
    
    res.render('price', { 
        title: metaData.title,
        meta: metaData,
        page: 'price'
    });
});

// Redirection 301 pour l'ancienne URL /price
app.get('/price', (req, res) => {
    res.redirect(301, '/tarifs-solutions-nettoyage-billets');
});

// MODIFIEZ ICI : Page Contact optimisée
app.get('/contact-laboratoire-nettoyage', (req, res) => {
    const metaData = {
        title: "Contact Clean Laboratoire | Expert Nettoyage Billets - Devis Gratuit",
        description: "Contactez Clean Laboratoire pour un devis gratuit. Expert en nettoyage de billets, solutions SSD, décapage sécurisé. Europe et Afrique.",
        keywords: "contact clean lab, devis nettoyage billets, expert SSD, laboratoire contact",
        canonical: "/contact-laboratoire-nettoyage"
    };
    
    res.render('contact', { 
        title: metaData.title,
        meta: metaData,
        page: 'contact'
    });
});

// Redirection 301 pour l'ancienne URL /contact
app.get('/contact', (req, res) => {
    res.redirect(301, '/contact-laboratoire-nettoyage');
});

// ============================================================================
// SOUS-PAGES SERVICES DÉTAILLÉES - CRITIQUE POUR LE SEO
// ============================================================================

// MODIFIEZ ICI : Ajoutez vos services spécifiques
app.get('/service/solution-ssd-universelle-nettoyage', (req, res) => {
    const metaData = {
        title: "Solution SSD Universelle | Nettoyage Professionnel Billets - Clean Lab",
        description: "Solution SSD universelle pour le nettoyage efficace de tous types de billets. Formule brevetée, résultats optimaux, sécurité maximale. Commandez maintenant.",
        keywords: "solution SSD universelle, nettoyage billets SSD, produit nettoyage billets, SSD universel",
        canonical: "/service/solution-ssd-universelle-nettoyage"
    };
    
    res.render('service-ssd', { 
        title: metaData.title,
        meta: metaData,
        page: 'service'
    });
});

app.get('/service/location-machines-decapage', (req, res) => {
    const metaData = {
        title: "Location Machines Décapage | Équipements Professionnels Billets",
        description: "Location de machines de décapage haute performance pour billets. Technologies dernier cri, formation incluse, support technique 24/7. Demande de location.",
        keywords: "location machine décapage, équipement nettoyage billets, machine professionnelle, location matériel",
        canonical: "/service/location-machines-decapage"
    };
    
    res.render('service-machines', { 
        title: metaData.title,
        meta: metaData,
        page: 'service'
    });
});

app.get('/service/analyse-spectrophotometrie-billets', (req, res) => {
    const metaData = {
        title: "Analyse Spectrophotométrie Billets | Clean Laboratoire",
        description: "Analyse spectrophotométrique des billets pour un nettoyage optimal. Technologies avancées, résultats précis, laboratoire certifié.",
        keywords: "analyse spectrophotométrie billets, nettoyage billets, laboratoire nettoyage, technologie avancée",
        canonical: "/service/analyse-spectrophotometrie-billets"
    };

    res.render('analyse-spectrophotometrie', {
        title: metaData.title,
        meta: metaData,
        page: 'service'
    });
});

app.get('/service/poudre-activation-nettoyage', (req, res) => {
    const metaData = {
        title: "Poudre d'Activation Nettoyage Billets | Clean Laboratoire",
        description: "Poudre d'activation innovante pour améliorer le nettoyage des billets. Formule exclusive, efficacité prouvée, facile à utiliser.",
        keywords: "poudre activation nettoyage, amélioration nettoyage billets, formule exclusive, poudre professionnelle",
        canonical: "/service/poudre-activation-nettoyage"
    };
    
    res.render('poudre-activation-nettoyage', { 
        title: metaData.title,
        meta: metaData,
        page: 'service'
    });
});

// ============================================================================
// PAGES SECONDAIRES AVEC URLs OPTIMISÉES
// ============================================================================

// MODIFIEZ ICI : Page Projets/Réalisations
app.get('/realisations-nettoyage-billets', (req, res) => {
    const metaData = {
        title: "Réalisations Nettoyage Billets | Projets Clean Laboratoire",
        description: "Découvrez nos réalisations en nettoyage et décapage de billets. Cas clients, projets réussis, témoignages. Clean Laboratoire - Expert depuis 10 ans.",
        keywords: "réalisations nettoyage billets, projets clean lab, cas clients, témoignages",
        canonical: "/realisations-nettoyage-billets"
    };
    
    res.render('project', { 
        title: metaData.title,
        meta: metaData,
        page: 'project'
    });
});

// Redirection 301 pour l'ancienne URL /project
app.get('/project', (req, res) => {
    res.redirect(301, '/realisations-nettoyage-billets');
});

// MODIFIEZ ICI : Page Équipements/Technologies
app.get('/technologies-equipements-nettoyage', (req, res) => {
    const metaData = {
        title: "Technologies & Équipements Nettoyage Billets | Clean Laboratoire",
        description: "Découvrez nos technologies de pointe pour le nettoyage de billets. Machines haute performance, solutions SSD avancées, laboratoire équipé.",
        keywords: "technologies nettoyage billets, équipements laboratoire, machines décapage, spectrophotométrie",
        canonical: "/technologies-equipements-nettoyage"
    };
    
    res.render('feature', { 
        title: metaData.title,
        meta: metaData,
        page: 'feature'
    });
});

// Redirection 301 pour l'ancienne URL /feature
app.get('/feature', (req, res) => {
    res.redirect(301, '/technologies-equipements-nettoyage');
});

// ============================================================================
// BLOG ET CONTENU - IMPORTANT POUR LE REFERENCEMENT
// ============================================================================

app.get('/blog-expertise-nettoyage-billets', (req, res) => {
    const metaData = {
        title: "Blog Expertise Nettoyage Billets | Conseils & Actualités Clean Lab",
        description: "Blog expert sur le nettoyage et décapage de billets. Actualités, guides, conseils techniques par les experts Clean Laboratoire.",
        keywords: "blog nettoyage billets, conseils expertise, actualités clean lab, guides techniques",
        canonical: "/blog-expertise-nettoyage-billets"
    };
    
    res.render('blog', { 
        title: metaData.title,
        meta: metaData,
        page: 'pages'
    });
});



// Redirection 301 pour l'ancienne URL /blog
app.get('/blog', (req, res) => {
    res.redirect(301, '/blog-expertise-nettoyage-billets');
});

// ============================================================================
// SITEMAP.XML DYNAMIQUE - ESSENTIEL POUR LE SEO
// ============================================================================

app.get('/sitemap.xml', (req, res) => {
    // MODIFIEZ ICI : Remplacez par votre domaine réel
    const baseUrl = 'https://www.clean-lab.com';
    
    const urls = [
        // Pages principales - Priorité haute
        { url: '/', changefreq: 'daily', priority: '1.0' },
        { url: '/a-propos-laboratoire-nettoyage-billets', changefreq: 'monthly', priority: '0.9' },
        { url: '/services-nettoyage-decapage-billets', changefreq: 'weekly', priority: '0.9' },
        { url: '/tarifs-solutions-nettoyage-billets', changefreq: 'monthly', priority: '0.8' },
        { url: '/contact-laboratoire-nettoyage', changefreq: 'monthly', priority: '0.8' },
        
        // Sous-pages services - Priorité moyenne
        { url: '/service/solution-ssd-universelle-nettoyage', changefreq: 'weekly', priority: '0.7' },
        { url: '/service/location-machines-decapage', changefreq: 'weekly', priority: '0.7' },
        
        // Pages secondaires
        { url: '/realisations-nettoyage-billets', changefreq: 'monthly', priority: '0.6' },
        { url: '/technologies-equipements-nettoyage', changefreq: 'monthly', priority: '0.6' },
        { url: '/blog-expertise-nettoyage-billets', changefreq: 'weekly', priority: '0.5' }
    ];

    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    urls.forEach(item => {
        sitemapXml += `
    <url>
        <loc>${baseUrl}${item.url}</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>${item.changefreq}</changefreq>
        <priority>${item.priority}</priority>
    </url>`;
    });

    sitemapXml += '\n</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(sitemapXml);
});

// ============================================================================
// ROBOTS.TXT INTELLIGENT
// ============================================================================

app.get('/robots.txt', (req, res) => {
    const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/

# Sitemaps
Sitemap: https://www.clean-lab.com/sitemap.xml

# Crawl delay pour éviter la surcharge
Crawl-delay: 1`;

    res.type('text/plain');
    res.send(robots);
});

// ============================================================================
// ROUTES EXISTANTES (POUR COMPATIBILITÉ)
// ============================================================================

app.get('/detail', (req, res) => {
    res.render('detail', { 
        title: 'Blog Detail',
        page: 'pages'
    });
});

app.get('/team', (req, res) => {
    res.render('team', { 
        title: 'The Team',
        page: 'pages'
    });
});

app.get('/testimonial', (req, res) => {
    res.render('testimonial', { 
        title: 'Testimonials',
        page: 'pages'
    });
});

app.get('/appointment', (req, res) => {
    res.render('appointment', { 
        title: 'Appointment',
        page: 'pages'
    });
});

app.get('/search', (req, res) => {
    res.render('search', { 
        title: 'Search',
        page: 'pages'
    });
});

// ============================================================================
// GESTION DES ERREURS
// ============================================================================

// Route 404 personnalisée
app.get('/404', (req, res) => {
    res.render('404', { 
        title: 'Page Non Trouvée - Clean Laboratoire',
        page: ''
    });
});

// Gestionnaire 404 global
app.use((req, res) => {
    res.status(404).render('404', { 
        title: 'Page Non Trouvée - Clean Laboratoire',
        page: ''
    });
});

// ============================================================================
// DÉMARRAGE DU SERVEUR
// ============================================================================

app.listen(PORT, () => {
    console.log(`
🚀 SERVEUR DÉMARRÉ AVEC OPTIMISATIONS SEO
📍 Port: ${PORT}
🌍 Langue par défaut : Français
📚 Langues disponibles : ${languages.join(', ')}

📈 FONCTIONNALITÉS SEO ACTIVÉES:
✅ URLs optimisées et sémantiques
✅ Redirections 301 pour anciennes URLs
✅ Sitemap XML dynamique
✅ Robots.txt intelligent
✅ Données structurées Schema.org
✅ Balises meta optimisées
✅ Multilinguisme avancé

🔧 PROCHAINES ÉTAPES:
1. MODIFIEZ les informations dans les sections "MODIFIEZ ICI"
2. Testez toutes les URLs: http://localhost:${PORT}/sitemap.xml
3. Soumettez le sitemap à Google Search Console
4. Configurez Google Analytics
    `);
});