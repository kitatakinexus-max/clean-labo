// ============================================================================
// MIDDLEWARE AUTHENTIFICATION ADMIN
// ============================================================================

/**
 * Protège les routes admin.
 * Vérifie la présence d'une session admin valide.
 * Redirige vers /admin/login si non authentifié.
 */
function requireAdminAuth(req, res, next) {
    if (req.session && req.session.adminAuthenticated === true) {
        return next();
    }
    // Stocker l'URL demandée pour redirection après login
    if (req.session) {
        req.session.returnTo = req.originalUrl;
    }
    return res.redirect('/admin/login');
}

module.exports = { requireAdminAuth };
