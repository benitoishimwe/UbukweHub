import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Sparkles, Zap, Building2, Heart, CheckCircle, XCircle,
  Clock, ExternalLink, RefreshCw, Loader, AlertTriangle, ReceiptText,
} from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { subscriptionsAPI } from '../services/api';
import { toast } from 'sonner';

const PLAN_META = {
  free:       { label: 'Free',       color: '#6B7280', icon: Zap,       bg: '#6B728015' },
  pro:        { label: 'Pro',        color: '#E67E22', icon: Sparkles,  bg: '#E67E2215' },
  max:        { label: 'Max',        color: '#0F4C5C', icon: Building2, bg: '#0F4C5C15' },
  wedding:    { label: 'Wedding',    color: '#FF6B6B', icon: Heart,     bg: '#FF6B6B15' },
  trial:      { label: 'Trial',      color: '#E67E22', icon: Sparkles,  bg: '#E67E2215' },
  enterprise: { label: 'Enterprise', color: '#0F4C5C', icon: Building2, bg: '#0F4C5C15' },
};

const STATUS_UI = {
  active:    { label: 'Active',       cls: 'text-emerald-700 bg-emerald-50', Icon: CheckCircle  },
  trial:     { label: 'Trial',        cls: 'text-amber-700 bg-amber-50',     Icon: Clock        },
  expired:   { label: 'Expired',      cls: 'text-red-700 bg-red-50',         Icon: XCircle      },
  cancelled: { label: 'Cancelled',    cls: 'text-gray-700 bg-gray-100',      Icon: XCircle      },
  past_due:  { label: 'Payment due',  cls: 'text-red-700 bg-red-50',         Icon: AlertTriangle },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatAmount(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function BillingPage() {
  const navigate = useNavigate();
  const { subscription, currentPlan, isOnTrial, trialDaysLeft, cancelAtPeriodEnd, refresh } = useSubscription();
  const [invoices,       setInvoices]       = useState([]);
  const [invoicesLoading,setInvoicesLoading]= useState(false);
  const [actionLoading,  setActionLoading]  = useState(null);

  const planMeta = PLAN_META[currentPlan] || PLAN_META.free;
  const PlanIcon = planMeta.icon;
  const statusKey = subscription?.status || 'active';
  const { label: statusLabel, cls: statusCls, Icon: StatusIcon } = STATUS_UI[statusKey] || STATUS_UI.active;

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const res = await subscriptionsAPI.invoices();
      setInvoices(res.data || []);
    } catch {
      // Stripe not configured — silently ignore
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your subscription? You will keep access until the end of the billing period.')) return;
    setActionLoading('cancel');
    try {
      await subscriptionsAPI.cancel();
      toast.success('Subscription scheduled for cancellation at period end');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    setActionLoading('resume');
    try {
      await subscriptionsAPI.resume();
      toast.success('Subscription cancellation reversed — you will continue to be billed');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resume subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    setActionLoading('portal');
    try {
      const res = await subscriptionsAPI.portal();
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Stripe Customer Portal is not configured');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>Billing</h1>
        <p className="text-sm text-[#6B7280] mt-1">Manage your subscription and payment history</p>
      </div>

      {/* ── Current plan card ── */}
      <div className="card-prani p-6 mb-6">
        <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-4">Current Plan</h2>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: planMeta.bg}}>
              <PlanIcon size={22} style={{color: planMeta.color}} />
            </div>
            <div>
              <p className="font-bold text-[#111827] text-lg" style={{fontFamily:'Poppins,sans-serif'}}>{planMeta.label}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}>
                <StatusIcon size={11} /> {statusLabel}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/pricing')}
            className="btn-gold px-4 py-2 text-sm font-semibold rounded-xl"
          >
            {currentPlan === 'free' ? 'Upgrade' : 'Change plan'}
          </button>
        </div>

        {/* Trial info */}
        {isOnTrial && trialDaysLeft !== null && (
          <div className="mt-4 flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-2 rounded-xl text-sm">
            <Clock size={14} />
            <span>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining in your trial</span>
          </div>
        )}

        {/* Period end */}
        {subscription?.currentPeriodEnd && (
          <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-[#E5E7EB]">
            {subscription.currentPeriodStart && (
              <div>
                <p className="text-xs text-[#9CA3AF]">Period started</p>
                <p className="text-sm font-medium text-[#374151]">{formatDate(subscription.currentPeriodStart)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[#9CA3AF]">{cancelAtPeriodEnd ? 'Access until' : 'Next renewal'}</p>
              <p className={`text-sm font-medium ${cancelAtPeriodEnd ? 'text-red-600' : 'text-[#374151]'}`}>
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
          </div>
        )}

        {/* Cancellation notice */}
        {cancelAtPeriodEnd && (
          <div className="mt-4 flex items-center gap-2 text-red-700 bg-red-50 px-3 py-2.5 rounded-xl text-sm">
            <AlertTriangle size={14} className="shrink-0" />
            <span>Your subscription is cancelled and will end on {formatDate(subscription?.currentPeriodEnd)}.</span>
          </div>
        )}

        {/* Subscription actions */}
        {currentPlan !== 'free' && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#E5E7EB]">
            {!cancelAtPeriodEnd ? (
              <button
                onClick={handleCancel}
                disabled={actionLoading === 'cancel'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                {actionLoading === 'cancel' ? <Loader size={12} className="animate-spin" /> : <XCircle size={13} />}
                Cancel subscription
              </button>
            ) : (
              <button
                onClick={handleResume}
                disabled={actionLoading === 'resume'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
              >
                {actionLoading === 'resume' ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={13} />}
                Resume subscription
              </button>
            )}

            {subscription?.stripeCustomerId && (
              <button
                onClick={handlePortal}
                disabled={actionLoading === 'portal'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9F9FB] text-xs font-semibold transition-colors"
              >
                {actionLoading === 'portal' ? <Loader size={12} className="animate-spin" /> : <ExternalLink size={13} />}
                Manage payment method
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Invoices ── */}
      <div className="card-prani p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">Payment History</h2>
          <button
            onClick={fetchInvoices}
            className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {invoicesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader size={22} className="animate-spin text-[#C9A84C]" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-10 text-[#9CA3AF]">
            <ReceiptText size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No invoices yet</p>
            <p className="text-xs mt-1">Invoices appear here after your first payment</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#F9F9FB] hover:bg-[#F3F4F6] transition-colors">
                <div className="flex items-center gap-3">
                  <ReceiptText size={16} className="text-[#9CA3AF] shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#374151]">{inv.number || inv.id}</p>
                    <p className="text-xs text-[#9CA3AF]">{formatDate(inv.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {inv.status}
                  </span>
                  <span className="text-sm font-bold text-[#111827]">
                    {formatAmount(inv.amount, inv.currency)}
                  </span>
                  {inv.pdfUrl && (
                    <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="p-1 rounded-lg hover:bg-white text-[#9CA3AF] hover:text-[#374151]">
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
