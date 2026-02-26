import React, { useMemo, useState } from 'react';
import { getInitials, getMemberCount } from './groupUtils';

const avatarPalette = [
  'bg-violet-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-indigo-500'
];

const resolveGroupMembers = (group) => {
  if (Array.isArray(group?.players)) {
    return group.players
      .map((player) => ({
        id: player?.id,
        name: player?.name || player?.full_name || player?.email || player?.phone || 'Player'
      }))
      .filter((member) => member.name);
  }

  if (Array.isArray(group?.player_names)) {
    return group.player_names.map((name, index) => ({ id: `name-${index}`, name }));
  }

  return [];
};

const GroupPicker = ({ groups = [], selectedGroupIds = [], onChange, onManageGroups, label = 'My Groups' }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) => `${group.name || ''} ${group.description || ''}`.toLowerCase().includes(q));
  }, [groups, search]);

  const selected = useMemo(
    () => groups.filter((group) => selectedGroupIds.includes(Number(group.id))),
    [groups, selectedGroupIds]
  );

  const selectedPlayers = useMemo(() => {
    const selectedGroupSet = new Set(selectedGroupIds.map((id) => Number(id)));
    return groups.reduce((total, group) => {
      if (!selectedGroupSet.has(Number(group.id))) {
        return total;
      }
      return total + getMemberCount(group);
    }, 0);
  }, [groups, selectedGroupIds]);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="rounded-xl bg-slate-100 p-1">
        <div className="grid grid-cols-2 gap-1 text-xs font-semibold">
          <div className="rounded-lg bg-white px-3 py-2 text-center text-slate-900 shadow-sm">
            Groups <span className="ml-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700">{groups.length}</span>
          </div>
          <div className="rounded-lg px-3 py-2 text-center text-slate-500">Players</div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-800">
        <span>
          <span className="font-semibold">{selectedPlayers} players</span> selected ({selected.length} group{selected.length === 1 ? '' : 's'})
        </span>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="font-semibold text-violet-700 transition hover:text-violet-900"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>
          <button
            type="button"
            onClick={onManageGroups}
            className="text-xs font-semibold text-violet-600 transition hover:text-violet-700"
          >
            Manage
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search groups..."
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500"
        />
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {filtered.map((group) => {
          const id = Number(group.id);
          const isSelected = selectedGroupIds.includes(id);
          const members = resolveGroupMembers(group);
          const memberCount = getMemberCount(group);
          const previewMembers = members.slice(0, 3);
          const overflowCount = Math.max(memberCount - previewMembers.length, 0);

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(isSelected ? selectedGroupIds.filter((x) => x !== id) : [...selectedGroupIds, id])}
              className={`w-full rounded-xl border-2 p-3 text-left transition ${
                isSelected ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${isSelected ? 'bg-violet-200' : 'bg-violet-100'}`}>
                  {group.emoji || '👥'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{group.name}</p>
                  <p className="text-xs text-slate-500">{memberCount} players</p>
                </div>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    isSelected ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-300 text-transparent'
                  }`}
                >
                  ✓
                </div>
              </div>

              {previewMembers.length > 0 ? (
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2">
                  <div className="flex">
                    {previewMembers.map((member, index) => (
                      <div
                        key={`${id}-${member.id || member.name}-${index}`}
                        className={`-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white first:ml-0 ${
                          avatarPalette[index % avatarPalette.length]
                        }`}
                      >
                        {getInitials(member.name)}
                      </div>
                    ))}
                    {overflowCount > 0 ? (
                      <div className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-bold text-slate-600">
                        +{overflowCount}
                      </div>
                    ) : null}
                  </div>
                  <span className="truncate text-[11px] text-slate-500">
                    {previewMembers.map((member) => member.name).join(', ')}
                    {overflowCount > 0 ? ', …' : ''}
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
        {filtered.length === 0 ? <p className="rounded-lg bg-white px-3 py-4 text-xs text-slate-500">No groups found.</p> : null}
      </div>
    </div>
  );
};

export default GroupPicker;
