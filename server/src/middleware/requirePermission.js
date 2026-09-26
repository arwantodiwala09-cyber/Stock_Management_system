export const requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.membership) {
            res.status(403).json({ error: 'Forbidden: No organization membership context' });
            return;
        }
        const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
        const hasPermission = perms.some((p) => req.membership.permissions.includes(p));
        if (!hasPermission) {
            res.status(403).json({ error: `Forbidden: Missing required permission (${perms.join(' or ')})` });
            return;
        }
        next();
    };
};
//# sourceMappingURL=requirePermission.js.map