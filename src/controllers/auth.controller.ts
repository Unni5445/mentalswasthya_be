import { Response, NextFunction, Request } from 'express';
import * as authService from '../services/auth.service';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';

const cookieOptions: any = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

class AuthController {
  static individualRegister = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { name, email, password } = req.body;
      const result = await authService.individualRegister({ name, email, password });
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
      res.status(201).json(new ApiResponse(201, { accessToken: result.accessToken, user: result.user }));
    }
  );

  static corporateRegister = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { name, email, password, orgId, role } = req.body;
      const result = await authService.corporateRegister({ name, email, password, orgId, role });
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
      res.status(201).json(new ApiResponse(201, { accessToken: result.accessToken, user: result.user }));
    }
  );

  static corporateSignUp = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { name, email, password, orgName, seats } = req.body;
      const result = await authService.corporateSignUp({ name, email, password, orgName, seats });
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
      res.status(201).json(new ApiResponse(201, { accessToken: result.accessToken, user: result.user }));
    }
  );

  static individualLogin = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, password } = req.body;
      const result = await authService.login(
        { email, password, issuer: 'individual' },
        req.ip,
        req.headers['user-agent']
      );
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
      res.status(200).json(new ApiResponse(200, { accessToken: result.accessToken, user: result.user }));
    }
  );

  static corporateLogin = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, password } = req.body;
      const result = await authService.login(
        { email, password, issuer: 'corporate' },
        req.ip,
        req.headers['user-agent']
      );
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
      res.status(200).json(new ApiResponse(200, { accessToken: result.accessToken, user: result.user }));
    }
  );

  static refresh = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      const issuer = req.body?.issuer || 'individual';
      const result = await authService.refresh(token, issuer);
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
      res.status(200).json(new ApiResponse(200, { accessToken: result.accessToken }));
    }
  );

  static logout = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (req.user) {
        await authService.logout(req.user._id, req.user.org?._id, req.ip);
      }
      res.clearCookie('refreshToken');
      res.status(200).json(new ApiResponse(200, {}, 'Logged out'));
    }
  );

  static forgotPassword = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.status(200).json(new ApiResponse(200, result, result.message));
    }
  );

  static resetPassword = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);
      res.status(200).json(new ApiResponse(200, result, result.message));
    }
  );
}

export default AuthController;
