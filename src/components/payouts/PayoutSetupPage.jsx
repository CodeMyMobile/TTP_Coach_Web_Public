import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, DollarSign, Loader2, RefreshCw } from 'lucide-react';
import { createPayoutSetupLink, getPayoutSetupStatus } from '../../api/CoachApi/payouts';

const currencyFromCents = (cents) => {
  const value = Number(cents || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
};

const PayoutSetupPage = ({ onBack }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  const queryState = useMemo(() => {
    const params = new URLSearchParams(window.location.search || '');
    return {
      retry: params.get('retry') === 'true',
      success: params.get('success') === 'true'
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadStatus = async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await getPayoutSetupStatus();
        if (mounted) {
          setStatus(payload || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || 'Unable to load payout setup.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSetup = async () => {
    setRedirecting(true);
    setError('');
    try {
      const payload = await createPayoutSetupLink();
      if (!payload?.redirect_url) {
        throw new Error('Stripe did not return an onboarding link.');
      }
      window.location.assign(payload.redirect_url);
    } catch (err) {
      setError(err?.message || 'Unable to start payout setup.');
      setRedirecting(false);
    }
  };

  const pendingBalance = status?.stripe_pending_balance ?? 0;
  const isComplete = Boolean(status?.stripe_onboarding_complete);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              {isComplete ? <CheckCircle2 className="h-6 w-6" /> : <DollarSign className="h-6 w-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-violet-700">Payout setup</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {isComplete ? 'Payouts are ready' : `${currencyFromCents(pendingBalance)} waiting`}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {isComplete
                  ? 'Your Stripe payout setup is complete. Earnings will follow the standard payout schedule.'
                  : 'Complete Stripe payout setup to receive your coaching earnings.'}
              </p>
            </div>
          </div>

          {queryState.retry ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
              That setup link expired or was already used. Start again to get a fresh link.
            </div>
          ) : null}

          {queryState.success && !isComplete ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
              Stripe is reviewing your details. This page will update after Stripe confirms payouts are active.
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          ) : null}

          {loading ? (
            <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payout status...
            </div>
          ) : null}

          {!loading && !isComplete ? (
            <button
              type="button"
              onClick={handleSetup}
              disabled={redirecting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60"
            >
              {redirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              Set Up Payouts
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default PayoutSetupPage;
