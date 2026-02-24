import React, { useMemo, useState } from 'react';
import { sendLessonInvites } from '../../services/coach';
import { parseInviteRecipients } from '../../utils/lessonInviteRecipients';

const PLAYER_LESSON_BASE_URL =
  (import.meta.env.VITE_PLAYER_LESSON_BASE_URL || import.meta.env.VITE_PLAYER_APP_URL || 'https://ttp-player-web-staging.netlify.app')
    .trim()
    .replace(/\/$/, '');

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.results)) {
      return value.results;
    }
    if (Array.isArray(value.invites)) {
      return value.invites;
    }
    if (Array.isArray(value.data?.results)) {
      return value.data.results;
    }
    if (Array.isArray(value.data)) {
      return value.data;
    }
  }

  return [];
};

const resolveRecipient = (item) =>
  item?.recipient || item?.email || item?.phone_number || item?.phone || item?.to || 'Unknown';

const resolveClaimLink = (item) =>
  item?.claimLink || item?.claim_link || item?.link || item?.url || '';

const normalizeInviteRows = (payload) => {
  return toArray(payload).map((item) => {
    const rawStatus = String(item?.status || item?.result || '').toLowerCase();
    const success =
      typeof item?.sent === 'boolean'
        ? item.sent
        : rawStatus.includes('sent') || rawStatus.includes('success') || item?.ok === true;

    return {
      recipient: resolveRecipient(item),
      sent: success,
      reason: item?.reason || item?.message || item?.error || '',
      claimLink: resolveClaimLink(item)
    };
  });
};

const copyToClipboard = async (value) => {
  if (!value || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

const LessonInvitePanel = ({ lessonId }) => {
  const [emailsInput, setEmailsInput] = useState('');
  const [phonesInput, setPhonesInput] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [inviteRows, setInviteRows] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedValue, setCopiedValue] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);

  const shareLink = useMemo(() => {
    if (!lessonId) {
      return '';
    }

    return `${PLAYER_LESSON_BASE_URL}/#/player/lesson/${lessonId}`;
  }, [lessonId]);

  const hasRecipients = useMemo(() => {
    const parsed = parseInviteRecipients({ emails: emailsInput, phones: phonesInput });
    return parsed.emails.length > 0 || parsed.phone_numbers.length > 0;
  }, [emailsInput, phonesInput]);

  const handleCopy = async (value) => {
    const copied = await copyToClipboard(value);
    if (copied) {
      setCopiedValue(value);
      window.setTimeout(() => setCopiedValue((current) => (current === value ? '' : current)), 1400);
    }
  };

  const handleSendInvites = async () => {
    if (!lessonId) {
      return;
    }

    const recipients = parseInviteRecipients({ emails: emailsInput, phones: phonesInput });
    if (recipients.emails.length === 0 && recipients.phone_numbers.length === 0) {
      setErrorMessage('Enter at least one email or phone number.');
      setStatusMessage('');
      return;
    }

    setSendingInvites(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const payload = {
        ...recipients,
        expires_in_days: Number.isFinite(Number(expiresInDays)) ? Math.max(1, Number(expiresInDays)) : 7
      };
      const response = await sendLessonInvites(lessonId, payload);
      const rows = normalizeInviteRows(response);
      setInviteRows(rows);
      setStatusMessage(rows.length > 0 ? 'Invites processed.' : 'Invites sent.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send invites.';
      setErrorMessage(message);
    } finally {
      setSendingInvites(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Lesson Invites</h4>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Emails</label>
          <input
            type="text"
            value={emailsInput}
            onChange={(event) => setEmailsInput(event.target.value)}
            placeholder="athlete1@example.com, athlete2@example.com"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone numbers</label>
          <input
            type="text"
            value={phonesInput}
            onChange={(event) => setPhonesInput(event.target.value)}
            placeholder="+1 555 111 2222, 555-333-4444"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Expires in days</label>
          <input
            type="number"
            min={1}
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(event.target.value)}
            className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleSendInvites}
            disabled={sendingInvites || !hasRecipients}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
              sendingInvites || !hasRecipients ? 'cursor-not-allowed bg-purple-300' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {sendingInvites ? 'Sending…' : 'Send Invites'}
          </button>

        </div>

        {statusMessage ? <p className="text-sm font-medium text-emerald-600">{statusMessage}</p> : null}
        {errorMessage ? <p className="text-sm font-medium text-rose-600">{errorMessage}</p> : null}

        {shareLink ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Shareable class link</p>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm text-emerald-900">{shareLink}</p>
              <button
                type="button"
                onClick={() => handleCopy(shareLink)}
                className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                {copiedValue === shareLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : null}

        {inviteRows.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Claim Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inviteRows.map((row, index) => (
                  <tr key={`${row.recipient}-${index}`}>
                    <td className="px-3 py-2 text-slate-800">{row.recipient}</td>
                    <td className="px-3 py-2">
                      <span className={row.sent ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                        {row.sent ? 'Sent' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.reason || '-'}</td>
                    <td className="px-3 py-2">
                      {row.claimLink ? (
                        <button
                          type="button"
                          onClick={() => handleCopy(row.claimLink)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {copiedValue === row.claimLink ? 'Copied' : 'Copy'}
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LessonInvitePanel;
