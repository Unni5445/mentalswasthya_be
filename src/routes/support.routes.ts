import { Router } from 'express';
import SupportController from '../controllers/support.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Support
 *   description: Support inquiries and contact form submissions
 */

/**
 * @swagger
 * /api/support/contact:
 *   post:
 *     summary: Submit a contact / support message
 *     tags: [Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message received and emails dispatched
 */
router.post('/contact', SupportController.submitContact);

export default router;
