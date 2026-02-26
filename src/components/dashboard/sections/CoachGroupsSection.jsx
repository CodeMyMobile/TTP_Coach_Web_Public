import React, { useMemo, useState } from 'react';
import GroupList from '../../groups/GroupList';
import GroupForm from '../../groups/GroupForm';

const normalizePlayers = (players = []) =>
  players
    .map((player) => ({
      id: Number(player.playerId ?? player.id ?? player.user_id),
      name: player.name || player.full_name || 'Student',
      email: player.email || ''
    }))
    .filter((player) => Number.isFinite(player.id));

const CoachGroupsSection = ({
  groups,
  groupsLoading,
  groupsError,
  groupsActionError,
  groupsSaving,
  onRefreshGroups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  players = []
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const normalizedPlayers = useMemo(() => normalizePlayers(players), [players]);

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Coach Groups</h2>
          <p className="text-sm text-gray-500">Create and manage your player groups.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingGroup(null);
            setIsFormOpen(true);
          }}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Create Group
        </button>
      </div>

      {groupsActionError ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{groupsActionError}</div> : null}

      <GroupList
        groups={groups}
        loading={groupsLoading}
        error={groupsError}
        onRetry={onRefreshGroups}
        onCreate={() => {
          setEditingGroup(null);
          setIsFormOpen(true);
        }}
        onEdit={(group) => {
          setEditingGroup(group);
          setIsFormOpen(true);
        }}
        onDelete={(group) => onDeleteGroup(group)}
      />

      <GroupForm
        isOpen={isFormOpen}
        mode={editingGroup ? 'edit' : 'create'}
        initialGroup={editingGroup}
        players={normalizedPlayers}
        isSaving={groupsSaving}
        onClose={() => {
          setIsFormOpen(false);
          setEditingGroup(null);
        }}
        onSubmit={(payload) => {
          if (editingGroup?.id) {
            onUpdateGroup(editingGroup.id, payload, () => {
              setIsFormOpen(false);
              setEditingGroup(null);
            });
            return;
          }

          onCreateGroup(payload, () => {
            setIsFormOpen(false);
          });
        }}
        onDelete={(group) => {
          onDeleteGroup(group, () => {
            setIsFormOpen(false);
            setEditingGroup(null);
          });
        }}
      />
    </section>
  );
};

export default CoachGroupsSection;
