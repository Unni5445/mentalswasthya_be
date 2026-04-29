import { Router } from 'express';
import OrgController from '../controllers/org.controller';
import { protect } from '../middlewares/protect.middleware';
import { authorize, corporateOnly } from '../middlewares/rbac.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Organization
 *   description: Corporate organization management
 */

// All org routes require authentication and must be through the corporate portal
router.use(protect);
router.use(corporateOnly);

// Only org_admin or super_admin can manage employees and see stats
router.use(authorize('org_admin', 'super_admin'));

/**
 * @swagger
 * /api/corporate/employees:
 *   get:
 *     summary: Get all employees in the organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees
 */
router.get('/employees', OrgController.getEmployees);

/**
 * @swagger
 * /api/corporate/employees/{id}:
 *   delete:
 *     summary: Remove an employee from the organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee removed
 */
router.delete('/employees/:id', OrgController.removeEmployee);

/**
 * @swagger
 * /api/corporate/stats:
 *   get:
 *     summary: Get organization statistics
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Org stats
 */
router.get('/stats', OrgController.getOrgStats);

/**
 * @swagger
 * /api/corporate/insights:
 *   get:
 *     summary: Get wellness insights for the organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wellness insights
 */
router.get('/insights', OrgController.getWellnessInsights);

export default router;
