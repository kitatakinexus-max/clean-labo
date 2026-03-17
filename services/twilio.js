const twilio = require('twilio');

/**
 * Service to handle WhatsApp notifications via Twilio
 */
class TwilioService {
    constructor() {
        this.client = null;
        this.from = null;
    }

    /**
     * Initialize the Twilio client with config from Environment (preferred) or Firestore
     * @param {Object} config - { sid, token, from }
     */
    init(config = {}) {
        const sid = process.env.TWILIO_ACCOUNT_SID || config.sid;
        const token = process.env.TWILIO_AUTH_TOKEN || config.token;
        this.from = process.env.TWILIO_WHATSAPP_FROM || config.from || 'whatsapp:+14155238886';

        if (!sid || !token) {
            console.warn('⚠️ Twilio config missing SID or Token (check .env or dashboard)');
            return false;
        }

        try {
            this.client = twilio(sid, token);
            console.log('✅ Twilio WhatsApp Service initialized');
            return true;
        } catch (err) {
            console.error('❌ Error initializing Twilio:', err.message);
            return false;
        }
    }

    /**
     * Send a WhatsApp message to one or more recipients
     * @param {string|string[]} toNumbers - List of authorized numbers (e.g., ["+336...", "+337..."])
     * @param {string} body - Message body
     */
    async sendWhatsApp(toNumbers, body) {
        if (!this.client) {
            console.error('❌ Twilio client not initialized');
            return { success: false, error: 'Twilio non initialisé' };
        }

        const recipients = Array.isArray(toNumbers) ? toNumbers : [toNumbers];
        const results = [];

        for (const to of recipients) {
            try {
                // Ensure number has whatsapp: prefix and is formatted correctly
                const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
                const formattedFrom = this.from.startsWith('whatsapp:') ? this.from : `whatsapp:${this.from}`;

                const message = await this.client.messages.create({
                    from: formattedFrom,
                    to: formattedTo,
                    body: body
                });
                results.push({ to, sid: message.sid, status: 'sent' });
            } catch (err) {
                console.error(`❌ Failed to send WhatsApp to ${to}:`, err.message);
                results.push({ to, error: err.message, status: 'failed' });
            }
        }

        return { success: results.some(r => r.status === 'sent'), details: results };
    }
}

module.exports = new TwilioService();
