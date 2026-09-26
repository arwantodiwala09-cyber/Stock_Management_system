import type { Request, Response, NextFunction } from 'express';

export const requirePermission = (requiredPermission: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.membership) {
      res.status(403).json({ error: 'Forbidden: No organization membership context' });
      return;
    }

    const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const hasPermission = perms.some((p) => req.membership!.permissions.includes(p));

    if (!hasPermission) {
      res.status(403).json({ error: `Forbidden: Missing required permission (${perms.join(' or ')})` });
      return;
    }

    next();
  };
};

