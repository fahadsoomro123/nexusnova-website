# NexusNova Redesign Recovery Snapshot

This branch is a frozen recovery snapshot for the current staging redesign state.

- Snapshot purpose: restore the current clean redesign, including the light background fixes for Categories, Articles, and Guides.
- Source branch at snapshot creation: `nexusnova-clean-redesign`
- Production branch: `main` (not modified by this redesign workflow)
- Restore workflow: `.github/workflows/restore-staging.yml`
- Confirmation required by workflow: `RESTORE`

Do not use this branch for experimental work. Create a new snapshot branch when the next audited baseline is ready.
