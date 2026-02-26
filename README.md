# Tennis Coach Platform Frontend

## Coach Groups + Lesson Group Selection

This update adds coach-facing player-group management and lesson creation group selection.

- New **Groups** dashboard tab for listing, creating, editing, and deleting coach groups.
- Group avatar fallback priority: `image_url` → `emoji` → initials.
- Group API errors are mapped to user-friendly messages for common statuses (`400`, `404`, `409`, `500+`).
- Lesson creation now supports selecting groups and sends `group_ids` with the lesson payload.
- Private lessons now validate that selected groups + selected players + invitees resolve to exactly one player.
- Semi-private and group lessons support mixed manual players + groups with deduped existing player IDs.
- Added utility tests for group-based payload/validation behavior.
