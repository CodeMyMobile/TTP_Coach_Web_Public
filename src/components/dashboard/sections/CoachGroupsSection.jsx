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
  onViewGroup,
  players = []
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedGroup, setSelectedGroup] = useState(null);

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
            setSelectedGroup(null);
            setFormMode('create');
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
          setSelectedGroup(null);
          setFormMode('create');
          setIsFormOpen(true);
        }}
        onView={async (group) => {
          const resolvedGroup = await onViewGroup(group);
          setSelectedGroup(resolvedGroup || group);
          setFormMode('view');
          setIsFormOpen(true);
        }}
        onEdit={async (group) => {
          const resolvedGroup = await onViewGroup(group);
          setSelectedGroup(resolvedGroup || group);
          setFormMode('edit');
          setIsFormOpen(true);
        }}
        onDelete={(group) => onDeleteGroup(group)}
      />

      <GroupForm
        isOpen={isFormOpen}
        mode={formMode}
        initialGroup={selectedGroup}
        players={normalizedPlayers}
        isSaving={groupsSaving}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedGroup(null);
          setFormMode('create');
        }}
        onSubmit={(payload) => {
          if (selectedGroup?.id && formMode === 'edit') {
            onUpdateGroup(selectedGroup.id, payload, () => {
              setIsFormOpen(false);
              setSelectedGroup(null);
              setFormMode('create');
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
            setSelectedGroup(null);
            setFormMode('create');
          });
        }}
      />
    </section>
  );
};

export default CoachGroupsSection;
