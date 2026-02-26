import React from 'react';
import { getInitials, getMemberCount } from './groupUtils';

const GroupAvatar = ({ group }) => {
  if (group?.image_url) {
    return <img src={group.image_url} alt={group.name} className="h-11 w-11 rounded-xl object-cover" />;
  }

  if (group?.emoji) {
    return <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-xl">{group.emoji}</div>;
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200 text-sm font-semibold text-slate-700">
      {getInitials(group?.name)}
    </div>
  );
};

const GroupList = ({ groups, loading, error, onRetry, onCreate, onEdit, onDelete }) => {
  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Loading groups...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{error}</p>
        <button type="button" className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
        <p className="text-sm text-slate-600">No groups yet. Create your first player group.</p>
        <button type="button" onClick={onCreate} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white">Create Group</button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <GroupAvatar group={group} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">{group.name}</p>
            <p className="text-xs text-slate-500">{getMemberCount(group)} players</p>
          </div>
          <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onClick={() => onEdit(group)}>Edit</button>
          <button type="button" className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600" onClick={() => onDelete(group)}>Delete</button>
        </div>
      ))}
    </div>
  );
};

export default GroupList;
