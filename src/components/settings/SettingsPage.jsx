import React, { useEffect, useState } from 'react';
import { addCoachProfile, getCoachProfile, updateProfileDetails } from '../../api/CoachApi/profileScreen';
import useAuth from '../../hooks/useAuth';

const SettingsPage = ({ onBack }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    aboutMe: '',
    hourlyRate: '',
    email: '',
    phone: '',
    experienceYears: '',
    certifications: '',
    pricePrivate: '',
    priceSemi: '',
    priceGroup: '',
    otherLanguages: ''
  });
  const [profileId, setProfileId] = useState(null);
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [stripeStatus, setStripeStatus] = useState({
    accountId: '',
    chargesEnabled: false,
    chargesDisabledReason: ''
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getCoachProfile();
        if (!response) {
          throw new Error('Failed to load profile.');
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.message || errorBody?.error || 'Failed to load profile.');
        }

        const payload = await response.json().catch(() => null);
        if (!isMounted) {
          return;
        }

        setProfileId(payload?.id ?? payload?.profile_id ?? null);
        setForm({
          fullName: payload?.full_name || payload?.name || '',
          aboutMe: payload?.about_me || payload?.bio || '',
          hourlyRate: payload?.hourly_rate ?? payload?.rate ?? '',
          email: payload?.email || '',
          phone: payload?.phone || '',
          experienceYears: payload?.experience_years ?? '',
          certifications: payload?.certifications ?? '',
          pricePrivate: payload?.price_private ?? '',
          priceSemi: payload?.price_semi ?? '',
          priceGroup: payload?.price_group ?? '',
          otherLanguages: payload?.other_languages ?? ''
        });
        setStripeStatus({
          accountId: payload?.stripe_account_id || '',
          chargesEnabled: Boolean(payload?.charges_enabled),
          chargesDisabledReason: payload?.charges_disabled_reason || ''
        });
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load profile.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setAction(null);
    setSaving(true);
    setError(null);

    try {
      if (!form.fullName.trim()) {
        throw new Error('Full name is required.');
      }

      const hourlyRate = Number(form.hourlyRate);
      const resolvedRate = Number.isFinite(hourlyRate) ? hourlyRate : 0;

      if (profileId) {
        const response = await updateProfileDetails({
          coachAccesstoken: user?.session?.access_token,
          id: profileId,
          fullName: form.fullName.trim(),
          aboutMe: form.aboutMe.trim(),
          hourlyRate: resolvedRate
        });

        if (!response?.ok) {
          const errorBody = await response?.json().catch(() => null);
          throw new Error(errorBody?.message || errorBody?.error || 'Failed to save profile.');
        }
      } else {
        const response = await addCoachProfile({
          accessToken: user?.session?.access_token,
          fullName: form.fullName.trim(),
          aboutMe: form.aboutMe.trim(),
          hourlyRate: resolvedRate,
          profilePicture: ''
        });

        if (!response?.ok) {
          const errorBody = await response?.json().catch(() => null);
          throw new Error(errorBody?.message || errorBody?.error || 'Failed to create profile.');
        }

        const created = await response.json().catch(() => null);
        setProfileId(created?.id ?? created?.profile_id ?? null);
      }

      setAction({ type: 'success', message: 'Profile saved successfully.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile.';
      setAction({ type: 'error', message });
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase text-gray-400">Settings</p>
            <h1 className="text-2xl font-semibold text-gray-900">Profile Settings</h1>
            <p className="text-sm text-gray-500">Update your coaching profile and rates</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {(action || error) && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              (action?.type === 'error' || error)
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-green-200 bg-green-50 text-green-700'
            }`}
          >
            {action?.message || error}
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {loading ? (
            <div className="text-sm text-gray-500">Loading profile...</div>
          ) : (
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">About</label>
                <textarea
                  rows={4}
                  value={form.aboutMe}
                  onChange={(event) => setForm((prev) => ({ ...prev, aboutMe: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Hourly rate</label>
                <input
                  type="number"
                  value={form.hourlyRate}
                  onChange={(event) => setForm((prev) => ({ ...prev, hourlyRate: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Experience (years)</label>
                  <input
                    type="number"
                    value={form.experienceYears}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Certifications</label>
                  <input
                    type="text"
                    value={form.certifications}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Private rate</label>
                  <input
                    type="number"
                    value={form.pricePrivate}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Semi-private rate</label>
                  <input
                    type="number"
                    value={form.priceSemi}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Group rate</label>
                  <input
                    type="number"
                    value={form.priceGroup}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Other languages</label>
                  <input
                    type="text"
                    value={form.otherLanguages}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
              </div>
              {stripeStatus.accountId && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <div>Stripe account: {stripeStatus.accountId}</div>
                  <div>
                    Charges enabled: {stripeStatus.chargesEnabled ? 'Yes' : 'No'}
                  </div>
                  {stripeStatus.chargesDisabledReason && (
                    <div>Reason: {stripeStatus.chargesDisabledReason}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
