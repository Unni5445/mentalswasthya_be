import { Router } from 'express';
import SubscriptionController from '../controllers/subscription.controller';
import { protect } from '../middlewares/protect.middleware';

const router = Router();

router.use(protect);

router.get('/my-subscription', SubscriptionController.getMySubscription);
router.get('/', SubscriptionController.getMySubscription);
router.post('/change-plan', SubscriptionController.updateSubscription);
router.put('/', SubscriptionController.updateSubscription);
router.post('/stop-auto-debit', SubscriptionController.stopAutoDebit);
router.post('/resume-auto-debit', SubscriptionController.resumeAutoDebit);
router.post('/cancel', SubscriptionController.cancelSubscription);
router.post('/reactivate', SubscriptionController.reactivateSubscription);

export default router;
