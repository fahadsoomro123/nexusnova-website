# NexusNova Staging Restore System

This repository contains a locked recovery baseline for the redesign branch.

## One-click restore

1. Open GitHub Actions.
2. Select Restore NexusNova staging snapshot.
3. Click Run workflow.
4. Enter RESTORE in the confirmation field.
5. Run it.

The workflow restores nexusnova-clean-redesign from:
nexusnova-redesign-locked-2026-10-02

Production main is not modified by this workflow.

## Recovery principle

Keep the locked recovery branch untouched. Future redesign work continues on nexusnova-clean-redesign.
