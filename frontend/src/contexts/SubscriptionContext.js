import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SubscriptionContext = createContext(null);

// Plans and the features they unlock — mirrors backend featureGate.js
const PLAN_FEATURES = {
  max:        ['ai_assistant', 'planner', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'white_label', 'api_access', 'save_the_date_image', 'admin_pages'],
  enterprise: ['ai_assistant', 'planner', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'white_label', 'api_access', 'save_the_date_image', 'admin_pages'],
  pro:        ['ai_assistant', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'admin_pages'],
  wedding:    ['ai_assistant', 'planner', 'save_the_date', 'vendor_marketplace', 'advanced_reports', 'save_the_date_image', 'admin_pages'],
  trial:      ['ai_assistant', 'planner', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'save_the_date_image', 'admin_pages'],
  free:       [],
};

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [subDetails,  setSubDetails]  = useState(null);
  const [loading,     setLoading]     = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) { setSubDetails(null); return; }
    setLoading(true);
    try {
      const res = await api.get('/subscriptions/current');
      // Route returns { subscription, features, plan, trialDaysLeft }
      setSubDetails(res.data);
    } catch {
      // Default to max so all features are accessible during dev
      setSubDetails({ plan: 'max', status: 'active', subscription: null, features: {}, trialDaysLeft: null });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const subscription   = subDetails?.subscription  ?? null;
  const currentPlan    = subDetails?.plan           ?? 'max';
  const isOnTrial      = subscription?.status === 'trial';
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd ?? false;

  // All standalone users (no tenant) on the free plan are in their automatic
  // 14-day trial window. We check that no subscription row exists yet to
  // distinguish new users from those whose trial has already expired.
  const hasNoSubscriptionRow = subscription === null;
  const dbTrialDaysLeft = subDetails?.trialDaysLeft ?? null;
  const dbTrialExpired  = dbTrialDaysLeft !== null && dbTrialDaysLeft <= 0;

  // For the default trial (no real subscription row yet), compute days remaining
  // from the user's account creation date.
  const TRIAL_DAYS = 14;
  let defaultTrialDaysLeft = null;
  if (!user?.tenantId && hasNoSubscriptionRow && user?.createdAt) {
    const elapsed = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
    defaultTrialDaysLeft = Math.max(0, TRIAL_DAYS - elapsed);
  }

  const isClientOnDefaultTrial =
    !user?.tenantId &&
    currentPlan === 'free' &&
    hasNoSubscriptionRow &&
    !dbTrialExpired &&
    (defaultTrialDaysLeft === null || defaultTrialDaysLeft > 0);

  // Effective trial days left: prefer DB value (real subscription), fall back to computed
  const trialDaysLeft = dbTrialDaysLeft ?? (isClientOnDefaultTrial ? defaultTrialDaysLeft : null);

  const isFeatureEnabled = (featureKey) => {
    // 0. Event managers always get the planner feature regardless of plan,
    //    because Planner is a core item for their role. AI and Save the Date
    //    are intentionally NOT exempt — they require an active trial/paid plan.
    if (user?.role === 'event_manager' && featureKey === 'planner') return true;

    // 1. Use the raw subscription row's plan — always correct even when the
    //    server-side computed `plan` is overridden by the tenant-tier bug.
    const rawPlan = subscription?.plan;
    if (rawPlan && PLAN_FEATURES[rawPlan]?.includes(featureKey)) return true;
    // 2. Active trial (status === 'trial') → treat as full trial tier.
    if (isOnTrial && PLAN_FEATURES['trial']?.includes(featureKey)) return true;
    // 3. New standalone users on free plan get 14-day trial features automatically.
    if (isClientOnDefaultTrial && PLAN_FEATURES['trial']?.includes(featureKey)) return true;
    // 4. Server-computed plan fallback.
    if (PLAN_FEATURES[currentPlan]?.includes(featureKey)) return true;
    // 5. Per-feature DB overrides returned by the API.
    return subDetails?.features?.[featureKey] === true;
  };

  const isPro = ['pro', 'max', 'enterprise', 'trial', 'wedding'].includes(currentPlan);
  // Expose the effective trial flag so TrialBanner and other components can use it
  const effectivelyOnTrial = isOnTrial || isClientOnDefaultTrial;

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      currentPlan,
      isPro,
      isOnTrial: effectivelyOnTrial,
      trialDaysLeft,
      cancelAtPeriodEnd,
      isFeatureEnabled,
      refresh: fetchSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};
