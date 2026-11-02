import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const email = req.body.email || req.body.username || req.body.identifier || req.body.emailOrUsername;
      const { password } = req.body;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      console.log(`[AUTH LOGIN] Attempt received for identifier: "${email}"`);
      const result = await authService.login(email, password, ipAddress);
      console.log(`[AUTH LOGIN] Success for user "${result.user.username || result.user.email}" (${result.user.fullName})`);
      res.json(result);
    } catch (err: any) {
      console.warn(`[AUTH LOGIN ERROR] ${err?.message || err}`);
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const result = await authService.refreshTokens(refreshToken, ipAddress);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)?.id || '';
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const result = await authService.logout(userId, ipAddress);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(req.user);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
