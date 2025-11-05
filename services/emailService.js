// services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'romualdelie27@gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // Valider les données du formulaire
    validateFormData(formData) {
        const errors = [];

        if (!formData.name || formData.name.length < 2) {
            errors.push('Le nom doit contenir au moins 2 caractères');
        }

        if (!formData.email || !this.isValidEmail(formData.email)) {
            errors.push('Email invalide');
        }

        if (!formData.phone || !this.isValidPhone(formData.phone)) {
            errors.push('Numéro de téléphone invalide');
        }

        if (!formData.service) {
            errors.push('Veuillez sélectionner un service');
        }

        if (!formData.currency) {
            errors.push('Veuillez sélectionner une devise');
        }

        if (!formData.volume) {
            errors.push('Veuillez spécifier le volume');
        }

        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const phoneRegex = /^[0-9+\-\s()]{10,}$/;
        return phoneRegex.test(phone);
    }

    // Mapper les valeurs pour l'email
    mapServiceValue(service) {
        const services = {
            'ssd': 'Solution SSD Universelle',
            'machines': 'Location Machines',
            'analysis': 'Analyse Spectrophotométrie',
            'powder': 'Poudres d\'Activation',
            'expertise': 'Expertise Conseil',
            'institution': 'Solution Institution'
        };
        return services[service] || service;
    }

    mapCurrencyValue(currency) {
        const currencies = {
            'usd': 'USD - Dollar Américain',
            'eur': 'EUR - Euro',
            'gbp': 'GBP - Livre Sterling',
            'other': 'Autre Devise'
        };
        return currencies[currency] || currency;
    }

    // Générer le contenu HTML de l'email
    generateEmailHTML(formData) {
        const service = this.mapServiceValue(formData.service);
        const currency = this.mapCurrencyValue(formData.currency);
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0d6efd 0%, #0dcaf0 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                    .field { margin-bottom: 15px; padding: 15px; background: white; border-radius: 5px; border-left: 4px solid #0d6efd; }
                    .field-label { font-weight: bold; color: #0d6efd; display: block; margin-bottom: 5px; }
                    .field-value { color: #333; }
                    .footer { text-align: center; margin-top: 20px; padding: 20px; color: #6c757d; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Nouvelle Demande d'Expertise</h1>
                        <p>Clean Laboratoire - Service Client</p>
                    </div>
                    <div class="content">
                        <div class="field">
                            <span class="field-label">📧 Informations Client</span>
                            <div class="field-value">
                                <strong>Nom:</strong> ${formData.name}<br>
                                <strong>Email:</strong> ${formData.email}<br>
                                <strong>Téléphone:</strong> ${formData.phone}
                            </div>
                        </div>
                        
                        <div class="field">
                            <span class="field-label">🛠️ Détails de la Demande</span>
                            <div class="field-value">
                                <strong>Service demandé:</strong> ${service}<br>
                                <strong>Devise à traiter:</strong> ${currency}<br>
                                <strong>Volume:</strong> ${formData.volume}
                            </div>
                        </div>
                        
                        ${formData.message ? `
                        <div class="field">
                            <span class="field-label">💬 Message du Client</span>
                            <div class="field-value">${formData.message.replace(/\n/g, '<br>')}</div>
                        </div>
                        ` : ''}
                        
                        <div class="field">
                            <span class="field-label">📋 Informations Techniques</span>
                            <div class="field-value">
                                <strong>IP:</strong> ${formData.clientIp || 'Non disponible'}<br>
                                <strong>User Agent:</strong> ${formData.userAgent || 'Non disponible'}<br>
                                <strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}
                            </div>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Cet email a été généré automatiquement depuis le formulaire de contact de Clean Laboratoire</p>
                        <p>© ${new Date().getFullYear()} Clean Laboratoire. Tous droits réservés.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Envoyer l'email
    async sendExpertiseEmail(formData, clientInfo = {}) {
        try {
            // Validation
            const errors = this.validateFormData(formData);
            if (errors.length > 0) {
                throw new Error(`Validation failed: ${errors.join(', ')}`);
            }

            // Préparer les données avec les infos client
            const emailData = {
                ...formData,
                clientIp: clientInfo.ip,
                userAgent: clientInfo.userAgent
            };

            // Configuration de l'email
            const mailOptions = {
                from: process.env.SMTP_FROM || `"Clean Laboratoire" <${process.env.SMTP_USER}>`,
                to: process.env.CONTACT_EMAIL || 'votre-email@clean-laboratoire.com',
                subject: `📩 Nouvelle Demande d'Expertise - ${formData.name}`,
                html: this.generateEmailHTML(emailData),
                text: this.generateEmailText(emailData)
            };

            // Envoyer l'email
            const result = await this.transporter.sendMail(mailOptions);
            
            console.log('Email envoyé avec succès:', result.messageId);
            return {
                success: true,
                messageId: result.messageId,
                message: 'Demande envoyée avec succès'
            };

        } catch (error) {
            console.error('Erreur envoi email:', error);
            throw new Error(`Erreur lors de l'envoi: ${error.message}`);
        }
    }

    // Version texte pour l'email
    generateEmailText(formData) {
        const service = this.mapServiceValue(formData.service);
        const currency = this.mapCurrencyValue(formData.currency);
        
        return `
NOUVELLE DEMANDE D'EXPERTISE - CLEAN LABORATOIRE

INFORMATIONS CLIENT:
Nom: ${formData.name}
Email: ${formData.email}
Téléphone: ${formData.phone}

DÉTAILS DE LA DEMANDE:
Service: ${service}
Devise: ${currency}
Volume: ${formData.volume}

${formData.message ? `MESSAGE:\n${formData.message}\n` : ''}

INFORMATIONS TECHNIQUES:
Date: ${new Date().toLocaleString('fr-FR')}
IP: ${formData.clientIp || 'Non disponible'}

---
Cet email a été généré automatiquement depuis le formulaire de contact.
        `;
    }
}

module.exports = new EmailService();