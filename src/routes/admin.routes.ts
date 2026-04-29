import { Router } from 'express';
import AdminController from '../controllers/admin.controller';
import { protect } from '../middlewares/protect.middleware';
import { authorize } from '../middlewares/rbac.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: SaaS Super Admin operations
 */

// All routes here are restricted to the SaaS Super Admin
router.use(protect);
router.use(authorize('super_admin'));

/**
 * @swagger
 * /api/saas/organizations:
 *   get:
 *     summary: Get all organizations
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get('/organizations', AdminController.getAllOrgs);

/**
 * @swagger
 * /api/saas/organizations/{orgId}/status:
 *   patch:
 *     summary: Toggle organization status (active/inactive)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/organizations/:orgId/status', AdminController.toggleOrgStatus);

/**
 * @swagger
 * /api/saas/organizations/{orgId}/subscription:
 *   patch:
 *     summary: Update organization subscription details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               seats: { type: number }
 *               plan: { type: string }
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Subscription updated
 */
router.patch('/organizations/:orgId/subscription', AdminController.updateOrgSubscription);

/**
 * @swagger
 * /api/saas/stats:
 *   get:
 *     summary: Get global platform statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Global stats
 */
router.get('/stats', AdminController.getGlobalStats);

/**
 * @swagger
 * /api/saas/audit-logs:
 *   get:
 *     summary: Get global audit logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of audit logs
 */
router.get('/audit-logs', AdminController.getGlobalAuditLogs);

export default router;
