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

  const selectedCount = useMemo(() => inviteRows.filter((row) => row.sent).length, [inviteRows]);

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
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
        <h4 className="text-base font-bold text-slate-900">Invite Players</h4>
        <button
          type="button"
          onClick={handleSendInvites}
          disabled={sendingInvites || !hasRecipients}
          className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition sm:text-sm ${
            sendingInvites || !hasRecipients ? 'cursor-not-allowed bg-purple-300' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {sendingInvites ? 'Sending…' : 'Done'}
        </button>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="rounded-xl bg-slate-100 p-1">
          <div className="grid grid-cols-2 gap-1">
            <div className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-slate-500">Groups</div>
            <div className="rounded-lg bg-white px-3 py-2 text-center text-xs font-semibold text-slate-900 shadow-sm">Players</div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-900">
          <span className="font-semibold">{selectedCount} invites</span> processed
          {selectedCount > 0 ? <span className="text-purple-700"> · {selectedCount} sent</span> : null}
        </div>

        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm">➕</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Invite Someone New</p>
              <p className="text-xs text-slate-500">Use email or phone to send lesson access</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Emails</label>
              <input
                type="text"
                value={emailsInput}
                onChange={(event) => setEmailsInput(event.target.value)}
                placeholder="athlete1@example.com, athlete2@example.com"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-purple-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Phone numbers</label>
              <input
                type="text"
                value={phonesInput}
                onChange={(event) => setPhonesInput(event.target.value)}
                placeholder="+1 555 111 2222, 555-333-4444"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-purple-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Expires in days</label>
              <input
                type="number"
                min={1}
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(event.target.value)}
                className="w-32 rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-purple-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSendInvites}
          disabled={sendingInvites || !hasRecipients}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
            sendingInvites || !hasRecipients ? 'cursor-not-allowed bg-purple-300' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          📨 {sendingInvites ? 'Sending…' : 'Send Invites'}
        </button>

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
          <div className="space-y-2">
            {inviteRows.map((row, index) => (
              <div
                key={`${row.recipient}-${index}`}
                className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 ${
                  row.sent ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                    row.sent ? 'bg-emerald-100' : 'bg-rose-100'
                  }`}
                >
                  {row.sent ? '✓' : '!'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{row.recipient}</p>
                  <p className={`text-xs ${row.sent ? 'text-emerald-700' : 'text-rose-700'}`}>{row.reason || (row.sent ? 'Invite sent' : 'Failed')}</p>
                </div>
                {row.claimLink ? (
                  <button
                    type="button"
                    onClick={() => handleCopy(row.claimLink)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {copiedValue === row.claimLink ? 'Copied' : 'Copy'}
                  </button>
                ) : null}
              </div>
            ))}

            <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block">
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
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LessonInvitePanel;
