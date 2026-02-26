import React, { useEffect, useMemo, useState } from 'react';

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
  const [form, setForm] = useState({ name: '', description: '', emoji: '', image_url: '', player_ids: [] });
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: initialGroup?.name || '',
      description: initialGroup?.description || '',
      emoji: initialGroup?.emoji || '',
      image_url: initialGroup?.image_url || '',
      player_ids: Array.isArray(initialGroup?.player_ids)
        ? initialGroup.player_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : []
    });
    setSearch('');
  }, [isOpen, initialGroup]);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((player) => `${player.name || ''} ${player.email || ''}`.toLowerCase().includes(q));
  }, [players, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900">{mode === 'edit' ? 'Edit Group' : 'Create Group'}</h3>
        {errorMessage ? <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{errorMessage}</p> : null}

        <div className="mt-4 space-y-3">
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Group name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Emoji (optional)" value={form.emoji} onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))} />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Image URL (optional)" value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} />

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Players ({form.player_ids.length})</p>
            </div>
            <input className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Search players..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {filteredPlayers.map((player) => {
                const id = Number(player.playerId ?? player.id ?? player.user_id);
                const selected = form.player_ids.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setForm((prev) => ({
                      ...prev,
                      player_ids: selected ? prev.player_ids.filter((x) => x !== id) : [...prev.player_ids, id]
                    }))}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm ${selected ? 'bg-violet-100' : 'bg-slate-50'}`}
                  >
                    <span>{player.name || player.full_name || 'Student'}</span>
                    {selected ? <span>✓</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={isSaving || !String(form.name).trim()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          {mode === 'edit' ? (
            <button type="button" onClick={() => onDelete?.(initialGroup)} className="ml-auto rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">Delete</button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default GroupForm;
