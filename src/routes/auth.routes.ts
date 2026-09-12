import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { protect } from '../middlewares/protect.middleware';
import { authorize, corporateOnly } from '../middlewares/rbac.middleware';

const router = Router();

// ── Individual portal ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/individual/register:
 *   post:
 *     summary: Register a new individual user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/individual/register', AuthController.individualRegister);

/**
 * @swagger
 * /api/auth/individual/login:
 *   post:
 *     summary: Login for individual users
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/individual/login', AuthController.individualLogin);
router.post('/individual/forgot-password', AuthController.forgotPassword);
router.post('/individual/reset-password', AuthController.resetPassword);

// ── Corporate portal ──────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/corporate/signup:
 *   post:
 *     summary: Signup a new corporation
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, orgName]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               orgName: { type: string }
 *     responses:
 *       201:
 *         description: Corporate account created
 */
router.post('/corporate/signup', AuthController.corporateSignUp);

/**
 * @swagger
 * /api/auth/corporate/login:
 *   post:
 *     summary: Login for corporate users
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/corporate/login', AuthController.corporateLogin);

// Corporate register is invite-only — org_admin or super_admin creates members
router.post(
  '/corporate/register',
  protect,
  corporateOnly,
  authorize('org_admin', 'super_admin'),
  AuthController.corporateRegister
);

// ── Shared ────────────────────────────────────────────────────────────────────
router.post('/refresh', AuthController.refresh);
router.post('/logout', protect, AuthController.logout);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

export default router;
