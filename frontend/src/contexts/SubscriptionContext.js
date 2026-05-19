import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) { setSubscription(null); return; }
    setLoading(true);
    try {
      const res = await api.get('/subscriptions/current');
      setSubscription(res.data);
    } catch {
      // Default to max so all features are accessible
      setSubscription({ plan: 'max', status: 'active', features: {} });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  // Plans and the features they unlock
  const PLAN_FEATURES = {
    max:        ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'white_label', 'api_access'],
    enterprise: ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'white_label', 'api_access'],
    pro:        ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports'],
    wedding:    ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'advanced_reports'],
    trial:      ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports'],
    free:       [],
  };

  const isFeatureEnabled = (featureKey) => {
    if (!subscription) return false;
    const plan = subscription.plan || 'free';
    // Check plan-level access first
    if (PLAN_FEATURES[plan]?.includes(featureKey)) return true;
    // Fall back to explicit feature flag from backend
    return subscription.features?.[featureKey]?.enabled === true;
  };

  const currentPlan = subscription?.plan || 'max';
  const isPro = ['pro', 'max', 'enterprise', 'trial', 'wedding'].includes(currentPlan);

  return (
    <SubscriptionContext.Provider value={{
      subscription, loading, currentPlan, isPro,
      isFeatureEnabled, refresh: fetchSubscription
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
