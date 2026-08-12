# Task Tracker

Updated: 2026-08-12

## Completed

- Initialized git repository on `main`.
- Removed local `backend/recsys.db` from the working tree.
- Confirmed `recsys.db` was not committed in repository history.
- Added explicit `.gitignore` exclusions for `*.db`, `recsys.db`, and `backend/recsys.db`.
- Created the four requested timestamped history commits.
- Polished English and Turkish READMEs with architecture, setup, quick-run, evaluation, and package notes.
- Added basic GitHub Actions CI for Python dependency install, flake8, and optional pytest execution.
- Added release notes summarizing repository state, timestamped history, and next recommended steps.

## Remaining

- Add deterministic seed data or a fixture-based setup path for `backend/recsys.db`.
- Add backend unit tests for recommender scoring, cold-start behavior, authentication helpers, and API responses.
- Add mobile smoke tests or Expo build validation.
- Move hard-coded mobile API/TMDB configuration to environment-based settings before public distribution.
