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

## Onboarding draft autosave behavior

- On onboarding load, the app fetches canonical onboarding data and a draft in parallel; draft fields override canonical values when present.
- Form edits autosave in the background with a debounced draft `PATCH` request and status feedback (`Saving…`, `Saved`, `Save failed. Retry`).
- Final submit still uses full onboarding `PUT` and then refreshes canonical onboarding data.
- A **Discard draft** action deletes the server draft and restores the form to last saved onboarding data.
- Current onboarding step is persisted locally so refresh restores the same step.

## Google coach sign-in configuration

Google coach login uses the Google Identity Services SDK in the login page and sends the returned `id_token` to:

- `POST /api/auth/google/coach-login`

Required frontend env vars:

- `VITE_GOOGLE_AUTH_CLIENT_ID` (preferred)
- `VITE_GOOGLE_CLIENT_ID` (fallback)
- Default fallback (currently configured): `1015123062756-ikedpium5t5p5a8pduq509haavm2j9un.apps.googleusercontent.com`

Set the frontend client ID to the same Google OAuth client configured in backend auth audience env settings (for example `GOOGLE_AUTH_CLIENT_ID`).
