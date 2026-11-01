import { Router } from 'express';
import BreathingController from '../controllers/breathing.controller';
import { protect } from '../middlewares/protect.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Breathing
 *   description: Breathing session management
 */

router.use(protect);

/**
 * @swagger
 * /api/breathing/start:
 *   post:
 *     summary: Start a new breathing session
 *     tags: [Breathing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [durationSeconds]
 *             properties:
 *               technique: { type: string }
 *               shape: { type: string }
 *               durationSeconds: { type: number }
 *               startedBy: { type: string, enum: [first_login_of_day, every_login, manual] }
 *     responses:
 *       201:
 *         description: Session started
 */
router.post('/start', BreathingController.startSession);

/**
 * @swagger
 * /api/breathing/complete/{sessionId}:
 *   post:
 *     summary: Complete a breathing session
 *     tags: [Breathing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cyclesCompleted]
 *             properties:
 *               cyclesCompleted: { type: number }
 *     responses:
 *       200:
 *         description: Session completed
 */
router.post('/complete/:sessionId', BreathingController.completeSession);

/**
 * @swagger
 * /api/breathing/history:
 *   get:
 *     summary: Get user's breathing session history
 *     tags: [Breathing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Session history
 */
router.get('/history', BreathingController.getHistory);

/**
 * @swagger
 * /api/breathing/custom-presets:
 *   get:
 *     summary: Get user's custom breathing presets from database
 *     tags: [Breathing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Custom breathing presets grouped by shape
 */
router.get('/custom-presets', BreathingController.getCustomPresets);

/**
 * @swagger
 * /api/breathing/custom-presets:
 *   post:
 *     summary: Save custom breathing preset in database (max 3 per shape, overwrites oldest)
 *     tags: [Breathing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shape, inhale, exhale]
 *             properties:
 *               shape: { type: string, enum: [triangle, box, circle] }
 *               name: { type: string }
 *               timingLabel: { type: string }
 *               inhale: { type: number }
 *               hold1: { type: number }
 *               exhale: { type: number }
 *               hold2: { type: number }
 *     responses:
 *       201:
 *         description: Preset saved
 */
router.post('/custom-presets', BreathingController.saveCustomPreset);

/**
 * @swagger
 * /api/breathing/custom-presets/{id}:
 *   delete:
 *     summary: Delete custom breathing preset by ID from database
 *     tags: [Breathing]
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
 *         description: Preset deleted
 */
router.delete('/custom-presets/:id', BreathingController.deleteCustomPreset);

export default router;

