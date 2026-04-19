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
      // Default to free if fetch fails
      setSubscription({ plan: 'free', status: 'active', features: {} });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const isFeatureEnabled = (featureKey) => {
    if (!subscription) return false;
    const f = subscription.features?.[featureKey];
    return f?.enabled === true;
  };

  const currentPlan = subscription?.plan || 'free';
  const isPro = ['pro', 'enterprise', 'trial'].includes(currentPlan);

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
