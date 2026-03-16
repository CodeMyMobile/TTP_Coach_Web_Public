import React, { useEffect, useMemo, useState } from 'react';

const resolvePlayerId = (player = {}) => {
  const id = Number(player.playerId ?? player.player_id ?? player.id ?? player.user_id ?? player.userId);
  return Number.isFinite(id) ? id : null;
};

const resolveGroupPlayerIds = (group = {}) => {
  if (Array.isArray(group?.player_ids)) {
    return group.player_ids
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
  }

  const memberEntries = Array.isArray(group?.members)
    ? group.members
    : Array.isArray(group?.players)
      ? group.players
      : [];

  return memberEntries
    .map((player) => resolvePlayerId(player))
    .filter((id) => id !== null);
};

const getTitleByMode = (mode) => {
  if (mode === 'view') return 'View group';
  if (mode === 'edit') return 'Edit group';
  return 'Create group';
};

const avatarThemes = [
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-sky-100', text: 'text-sky-700' }
];

const getPlayerDisplayName = (player = {}) => player.name || player.full_name || 'Student';

const getPlayerInitials = (name = '') =>
  String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'ST';

const getAvatarTheme = (id) => avatarThemes[Math.abs(Number(id) || 0) % avatarThemes.length];

const PlayerAvatar = ({ player }) => {
  const theme = getAvatarTheme(player?.id);
  const initials = getPlayerInitials(getPlayerDisplayName(player));

  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${theme.bg} ${theme.text}`}>
      {initials}
    </div>
  );
};

const GroupForm = ({
  isOpen,
  mode = 'create',
  initialGroup = null,
  players = [],
  isSaving = false,
  onClose,
  onSubmit,
  onDelete,
  errorMessage = ''
}) => {
  const [form, setForm] = useState({ name: '', player_ids: [] });
  const [search, setSearch] = useState('');
  const isViewMode = mode === 'view';

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: initialGroup?.name || '',
      player_ids: resolveGroupPlayerIds(initialGroup)
    });
    setSearch('');
  }, [isOpen, initialGroup]);

  const availablePlayers = useMemo(() => {
    const groupMembers = Array.isArray(initialGroup?.members)
      ? initialGroup.members
      : Array.isArray(initialGroup?.players)
        ? initialGroup.players
        : [];

    const normalizedGroupMembers = groupMembers
      .map((player) => {
        const id = resolvePlayerId(player);
        if (id === null) return null;
        return {
          id,
          name: player.name || player.full_name || 'Student',
          email: player.email || ''
        };
      })
      .filter(Boolean);

    const mergedPlayers = [...players, ...normalizedGroupMembers];
    const deduped = new Map();
    mergedPlayers.forEach((player) => {
      const id = resolvePlayerId(player);
      if (id === null) return;
      if (!deduped.has(id)) {
        deduped.set(id, {
          id,
          name: getPlayerDisplayName(player),
          email: player.email || ''
        });
      }
    });

    return Array.from(deduped.values());
  }, [players, initialGroup]);

  const selectedPlayers = useMemo(
    () => form.player_ids
      .map((id) => availablePlayers.find((player) => player.id === id))
      .filter(Boolean),
    [availablePlayers, form.player_ids]
  );

  const addablePlayers = useMemo(
    () => availablePlayers.filter((player) => !form.player_ids.includes(player.id)),
    [availablePlayers, form.player_ids]
  );

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return addablePlayers;
    return addablePlayers.filter((player) => `${player.name || ''} ${player.email || ''}`.toLowerCase().includes(q));
  }, [addablePlayers, search]);

  const addPlayer = (id) => {
    if (isViewMode) return;
    setForm((prev) => ({
      ...prev,
      player_ids: prev.player_ids.includes(id) ? prev.player_ids : [...prev.player_ids, id]
    }));
  };

  const removePlayer = (id) => {
    if (isViewMode) return;
    setForm((prev) => ({
      ...prev,
      player_ids: prev.player_ids.filter((playerId) => playerId !== id)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[min(90vh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-violet-50 via-white to-white p-5 sm:p-6">
          <div className="space-y-1">
            <h3 className="text-[22px] font-bold tracking-tight text-slate-950">{getTitleByMode(mode)}</h3>
            <p className="text-sm text-slate-500">
              {isViewMode ? 'Review this group and its current members.' : 'Name the group and manage members inline.'}
            </p>
          </div>

          {errorMessage ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

          <div className="mt-5 flex min-h-0 flex-1 flex-col gap-4">
            <input
              disabled={isViewMode}
              type="text"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-violet-500 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Group name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  In this group <span className="text-violet-600">({form.player_ids.length})</span>
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {selectedPlayers.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {selectedPlayers.map((player) => (
                      <div key={player.id} className="flex items-center gap-3 px-4 py-3">
                        <PlayerAvatar player={player} />
                        <span className="flex-1 text-sm font-medium text-slate-900">{getPlayerDisplayName(player)}</span>
                        {!isViewMode ? (
                          <button
                            type="button"
                            onClick={() => removePlayer(player.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg leading-none text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                            aria-label={`Remove ${getPlayerDisplayName(player)}`}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-b border-slate-200 px-4 py-4 text-center text-sm italic text-slate-400">
                    No players added yet
                  </div>
                )}

                {!isViewMode ? (
                  <>
                    <div className="border-y border-slate-200 bg-slate-50/80 px-4 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Add players</p>
                    </div>
                    <div className="border-b border-slate-200 px-3 py-3">
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500"
                        placeholder="Search players..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    {filteredPlayers.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {filteredPlayers.map((player) => (
                          <div key={player.id} className="flex items-center gap-3 px-4 py-3">
                            <PlayerAvatar player={player} />
                            <span className="flex-1 text-sm font-medium text-slate-900">{getPlayerDisplayName(player)}</span>
                            <button
                              type="button"
                              onClick={() => addPlayer(player.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-violet-500 text-lg font-light leading-none text-violet-600 transition hover:bg-violet-50"
                              aria-label={`Add ${getPlayerDisplayName(player)}`}
                            >
                              +
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-center text-sm text-slate-400">
                        {addablePlayers.length === 0 ? 'All players are already in this group.' : 'No players match your search.'}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200/80 bg-white/90 pt-4 backdrop-blur-sm">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3.5 text-base font-medium text-slate-900 transition hover:bg-slate-50 sm:flex-none sm:min-w-[120px]"
            >
              {isViewMode ? 'Close' : 'Cancel'}
            </button>
            {!isViewMode ? (
              <button
                type="button"
                onClick={() => onSubmit(form)}
                disabled={isSaving || !String(form.name).trim()}
                className="flex-[1.4] rounded-2xl bg-violet-600 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            ) : null}
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={() => onDelete?.(initialGroup)}
                className="rounded-2xl border border-red-200 px-4 py-3.5 text-base font-medium text-red-600 transition hover:bg-red-50"
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupForm;
