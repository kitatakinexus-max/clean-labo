#!/usr/bin/env node

/**
 * Script d'audit SEO pour Clean Laboratoire
 * Usage: node scripts/seo-audit.js
 */

const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class SEOAuditor {
    constructor() {
        this.baseUrl = 'https://www.clean-lab.com';
        this.urlsToCheck = [
            '/',
            '/a-propos-laboratoire-nettoyage-billets',
            '/services-nettoyage-decapage-billets',
            '/service/solution-ssd-universelle-nettoyage',
            '/service/location-machines-decapage',
            '/tarifs-solutions-nettoyage-billets',
            '/contact-laboratoire-nettoyage',
            '/sitemap.xml',
            '/robots.txt'
        ];
    }

    // Vérifier le statut HTTP des URLs
    async checkURLStatus(url) {
        return new Promise((resolve) => {
            const fullUrl = this.baseUrl + url;
            https.get(fullUrl, (res) => {
                resolve({
                    url: fullUrl,
                    status: res.statusCode,
                    ok: res.statusCode === 200
                });
            }).on('error', (err) => {
                resolve({
                    url: fullUrl,
                    status: 'ERROR',
                    ok: false,
                    error: err.message
                });
            });
        });
    }

    // Vérifier la présence des balises meta
    checkMetaTags(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const checks = {
                hasTitle: /<title>.*?<\/title>/i.test(content),
                hasMetaDescription: /<meta name="description"/i.test(content),
                hasViewport: /<meta name="viewport"/i.test(content),
                hasCanonical: /<link rel="canonical"/i.test(content),
                hasStructuredData: /schema\.org/i.test(content)
            };
            return checks;
        } catch (error) {
            return { error: error.message };
        }
    }

    // Générer un rapport
    generateReport(results) {
        console.log('📊 RAPPORT SEO - CLEAN LABORATOIRE');
        console.log('=' .repeat(50));
        
        console.log('\n🔍 STATUT DES URLs:');
        results.urlStatus.forEach(result => {
            const icon = result.ok ? '✅' : '❌';
            console.log(`${icon} ${result.url} - Status: ${result.status}`);
        });

        console.log('\n🏷️ BALISES META:');
        Object.entries(results.metaTags).forEach(([file, tags]) => {
            console.log(`\n📄 ${file}:`);
            Object.entries(tags).forEach(([tag, present]) => {
                const icon = present ? '✅' : '❌';
                console.log(`  ${icon} ${tag}`);
            });
        });

        console.log('\n📈 RECOMMANDATIONS:');
        this.printRecommendations(results);
    }

    printRecommendations(results) {
        const issues = [];
        
        // Vérifier les URLs en erreur
        const brokenUrls = results.urlStatus.filter(r => !r.ok);
        if (brokenUrls.length > 0) {
            issues.push(`❌ ${brokenUrls.length} URL(s) en erreur`);
        }

        // Vérifier les balises manquantes
        Object.entries(results.metaTags).forEach(([file, tags]) => {
            Object.entries(tags).forEach(([tag, present]) => {
                if (!present && tag !== 'error') {
                    issues.push(`❌ ${file}: Balise ${tag} manquante`);
                }
            });
        });

        if (issues.length === 0) {
            console.log('✅ Tous les critères SEO sont respectés!');
        } else {
            issues.forEach(issue => console.log(issue));
        }
    }

    async run() {
        console.log('🔍 Début de l\'audit SEO...\n');

        // Vérifier le statut des URLs
        const urlStatus = [];
        for (const url of this.urlsToCheck) {
            const status = await this.checkURLStatus(url);
            urlStatus.push(status);
            // Délai pour éviter le rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Vérifier les balises meta des templates
        const metaTags = {
            'header.ejs': this.checkMetaTags(path.join(__dirname, '../views/partials/header.ejs')),
            'index.ejs': this.checkMetaTags(path.join(__dirname, '../views/index.ejs')),
            'about.ejs': this.checkMetaTags(path.join(__dirname, '../views/about.ejs'))
        };

        // Générer le rapport
        this.generateReport({ urlStatus, metaTags });
    }
}

// Exécuter l'audit
const auditor = new SEOAuditor();
auditor.run().catch(console.error);