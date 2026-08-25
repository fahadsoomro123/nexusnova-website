# NOVA AI POWER V6 — Easy Setup

## Bas 3 steps
1. Double-click `CHECK_HARDWARE_V6.bat`.
2. Double-click `INSTALL_MODEL.bat` once. It installs/pulls the local `gpt-oss:20b` model through Ollama.
3. Double-click `START_NOVA_AI_V6.bat` whenever you want to use the PC brain.

The big download is still the local model. V6 planner, Builder, project search, reviewer, critic, memory and tools are small code files.

## Mobile modes
- Chat — normal assistant
- Web — fresh public web lookup
- Research — deeper multi-source research
- Website — NexusNova website work
- Dev — coding/debugging
- App Builder — create a new project under `generated-apps/`, implement it, run recognized checks/builds and export project ZIPs
- Power V6 — maximum safe multi-step workflow

## What Power V6 does
For complex work V6 can use:
`Project Context → Planner → Worker → Build/Test → Reviewer → Critic → up to 2 correction passes`

It keeps Owner Rules and Memory, creates local task journals, can create checkpoints before risky work, and uses selective Git commits so unrelated staged work is not silently included.

## GitHub safety
Local read/edit/build work is available in Dev/Website/Builder/Power modes. GitHub push/PR stays OFF until explicitly armed from the paired mobile client. V6 never intentionally pushes directly to `main`.

## New app support
V6 includes lightweight starter scaffolds for web apps, PWAs and Python apps. It can also work on existing Android/Gradle projects when they are inside the configured workspace and the required Android/Gradle toolchain is installed. V6 does not bundle the Android SDK because that would make the download much larger.

## Important
V6 is a specialized local agent powered by an open-weight model. It is not a literal copy of ChatGPT Plus or GPT-5.6 Sol, and it should not claim that every task will match a larger cloud model. Its strength is NexusNova-specific context, tools, autonomy, testing and verification without a recurring model subscription.
