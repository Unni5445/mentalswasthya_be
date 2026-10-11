import { Subscription } from '../models';

export const formatSubscriptionWithAlerts = (sub: any) => {
  if (!sub) return null;
  const subObj = typeof sub.toObject === 'function' ? sub.toObject() : { ...sub };

  const now = new Date();
  const currentPeriodEnd = new Date(subObj.currentPeriodEnd);
  const diffMs = currentPeriodEnd.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const GRACE_PERIOD_DAYS = 14;
  const gracePeriodEnd = new Date(currentPeriodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const graceDiffMs = gracePeriodEnd.getTime() - now.getTime();
  const graceDaysLeft = Math.max(0, Math.ceil(graceDiffMs / (1000 * 60 * 60 * 24)));

  const isExpired = daysLeft <= 0;
  const isGracePeriod = (isExpired && now <= gracePeriodEnd) || subObj.status === 'past_due' || (subObj.status === 'canceled' && isExpired);
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 14 && subObj.status === 'active';

  let alertType: 'expiring_soon' | 'grace_period' | null = null;
  let alertMessage: string | null = null;

  if (isExpiringSoon) {
    alertType = 'expiring_soon';
    alertMessage = `Your current plan will expire in ${daysLeft} days, please buy subscription for continued service`;
  } else if (isGracePeriod || isExpired) {
    alertType = 'grace_period';
    alertMessage = `Currently you do not have any active plans, you are running on grace period. Please buy subscription to get uninterrupted usage`;
  }

  return {
    ...subObj,
    daysLeft,
    graceDaysLeft,
    isExpiringSoon,
    isGracePeriod,
    alertType,
    alertMessage,
  };
};

export const getMySubscription = async (userId: any) => {
  let sub = await Subscription.findOne({ user: userId });

  if (!sub) {
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1); // 1 year default for pro

    sub = await Subscription.create({
      user: userId,
      tier: 'pro',
      planName: 'Wellness Pro',
      billingCycle: 'annual',
      price: 7.99,
      status: 'active',
      autoDebit: true,
      currentPeriodStart,
      currentPeriodEnd,
    });
  }

  return formatSubscriptionWithAlerts(sub);
};

export const updateSubscription = async (
  userId: any,
  { tier = 'pro', billingCycle = 'annual' }: { tier?: string; billingCycle?: string }
) => {
  let sub = await Subscription.findOne({ user: userId });

  const now = new Date();
  const currentPeriodEnd = new Date(now);
  if (billingCycle === 'annual') {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  } else {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  }

  let planName = 'Wellness Pro';
  let price = billingCycle === 'annual' ? 7.99 : 9.99;

  if (tier === 'free') {
    planName = 'Standard Calm';
    price = 0;
  } else if (tier === 'executive') {
    planName = 'Mindfulness Executive';
    price = billingCycle === 'annual' ? 14.99 : 19.99;
  }

  if (!sub) {
    sub = await Subscription.create({
      user: userId,
      tier: tier as any,
      planName,
      billingCycle: billingCycle as any,
      price,
      status: 'active',
      autoDebit: tier !== 'free',
      currentPeriodStart: now,
      currentPeriodEnd,
    });
  } else {
    sub.tier = tier as any;
    sub.planName = planName;
    sub.billingCycle = billingCycle as any;
    sub.price = price;
    sub.status = 'active';
    sub.canceledAt = null;
    sub.autoDebit = tier !== 'free';
    sub.autoDebitStoppedAt = null;
    sub.currentPeriodStart = now;
    sub.currentPeriodEnd = currentPeriodEnd;
    await sub.save();
  }

  return formatSubscriptionWithAlerts(sub);
};

export const stopAutoDebit = async (userId: any) => {
  let sub = await Subscription.findOne({ user: userId });
  if (!sub) {
    await getMySubscription(userId);
    sub = await Subscription.findOne({ user: userId });
  }

  if (sub) {
    sub.autoDebit = false;
    sub.autoDebitStoppedAt = new Date();
    await sub.save();
  }

  return {
    subscription: formatSubscriptionWithAlerts(sub),
    message: 'Auto-debit stopped successfully. Your plan will not renew automatically.',
  };
};

export const resumeAutoDebit = async (userId: any) => {
  let sub = await Subscription.findOne({ user: userId });
  if (!sub) {
    await getMySubscription(userId);
    sub = await Subscription.findOne({ user: userId });
  }

  if (sub) {
    sub.autoDebit = true;
    sub.autoDebitStoppedAt = null;
    await sub.save();
  }

  return {
    subscription: formatSubscriptionWithAlerts(sub),
    message: 'Auto-debit resumed successfully. Automatic payments enabled.',
  };
};

export const cancelSubscription = async (userId: any) => {
  let sub = await Subscription.findOne({ user: userId });
  if (!sub) {
    await getMySubscription(userId);
    sub = await Subscription.findOne({ user: userId });
  }

  if (sub) {
    sub.status = 'canceled';
    sub.canceledAt = new Date();
    sub.autoDebit = false;
    sub.autoDebitStoppedAt = new Date();
    await sub.save();
  }

  return {
    subscription: formatSubscriptionWithAlerts(sub),
    message: 'Subscription cancelled successfully. You retain access until the end of your billing cycle.',
  };
};

export const reactivateSubscription = async (userId: any) => {
  let sub = await Subscription.findOne({ user: userId });
  if (!sub) {
    await getMySubscription(userId);
    sub = await Subscription.findOne({ user: userId });
  }

  if (sub) {
    sub.status = 'active';
    sub.canceledAt = null;
    sub.autoDebit = true;
    sub.autoDebitStoppedAt = null;
    await sub.save();
  }

  return {
    subscription: formatSubscriptionWithAlerts(sub),
    message: 'Subscription reactivated successfully!',
  };
};
