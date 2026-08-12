# Release Notes

Generated: 2026-08-12

## Repository State

- Source tree contains the FastAPI backend, Expo mobile app, Turkish project docs, English/Turkish READMEs, MIT license, example environment file, and basic CI workflow.
- Local SQLite database files are excluded from version control. `backend/recsys.db` is not present in the working tree and is ignored by `.gitignore`.
- The backend implements collaborative filtering, content-based filtering, hybrid scoring, cold-start weighting, authentication helpers, recommendation endpoints, and admin analytics endpoints.
- The mobile app includes login/register flows, a cold-start survey, daily recommendation cards, swipe feedback, and admin screen navigation.

## Timestamped History

| Date | Commit Message |
| --- | --- |
| 2025-09-15 10:00:00 +0300 | `chore: initial project structure and packaging` |
| 2025-10-20 14:30:00 +0300 | `feat(backend): implement collaborative, content-based and hybrid recommendation algorithms` |
| 2025-11-28 11:15:00 +0300 | `feat(mobile): integrate React Native UI with cold-start survey and daily recommendation feature` |
| 2026-01-15 16:00:00 +0300 | `docs: add EN/TR documentation with evaluation metrics and package notes` |

## Release Preparation Notes

- `README.md` now documents architecture, setup, quick-run flow, packaging notes, and local database expectations in English.
- `README.tr.md` now mirrors the same release-critical information in Turkish.
- `.github/workflows/ci.yml` installs backend dependencies, runs a narrow flake8 syntax/error lint gate, and runs `pytest` only when Python tests exist.

## Next Recommended Steps

- Add a deterministic database seed or fixture workflow so new contributors can run recommendations without a private local SQLite file.
- Add backend unit tests for hybrid scoring, cold-start behavior, auth helpers, and API response shapes.
- Add mobile smoke tests or Expo build checks before publishing release artifacts.
- Replace hard-coded mobile API/TMDB settings with environment-based configuration before public distribution.
