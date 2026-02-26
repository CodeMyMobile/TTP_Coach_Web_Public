import React, { useMemo, useState } from 'react';
import { getMemberCount } from './groupUtils';

const GroupPicker = ({ groups = [], selectedGroupIds = [], onChange, label = 'Groups (optional)' }) => {
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

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <label className="block text-sm font-semibold text-slate-800">{label}</label>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((group) => (
            <span key={`selected-group-${group.id}`} className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
              <span>{group.emoji || '👥'}</span>
              {group.name}
              <button type="button" onClick={() => onChange(selectedGroupIds.filter((id) => id !== Number(group.id)))}>×</button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search groups..."
        className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500"
      />
      <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
        {filtered.map((group) => {
          const id = Number(group.id);
          const isSelected = selectedGroupIds.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(isSelected ? selectedGroupIds.filter((x) => x !== id) : [...selectedGroupIds, id])}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${isSelected ? 'bg-violet-100' : 'bg-slate-50 hover:bg-slate-100'}`}
            >
              <span className="text-lg">{group.emoji || '👥'}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-800">{group.name}</span>
                <span className="block text-xs text-slate-500">{getMemberCount(group)} players</span>
              </span>
              {isSelected ? <span className="text-violet-700">✓</span> : null}
            </button>
          );
        })}
        {filtered.length === 0 ? <p className="text-xs text-slate-500">No groups found.</p> : null}
      </div>
    </div>
  );
};

export default GroupPicker;
