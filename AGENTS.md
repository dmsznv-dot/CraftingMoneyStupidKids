# Instructions for coding agents
Read HANDOFF.md, docs/GAME_SPEC.md and QA.md before changing behavior.
This is a local playable MVP, not a verified Yandex Games release.
Use a separate task branch. Preserve other agents' changes; no force-push.
Keep simulation in src/core.ts independent from Phaser rendering and SDK.
Do not change the approved nudge rule: wood/stone/iron/gold/diamond/obsidian/netherite = 0/1/2/3/4/4/4 per attempt, one shared budget for left/right, no ad refills.
Permanent purchases are deterministic, failures never subtract saved currency, rewarded remains optional.
Only one enchantment active. Starter TNT is a permanent purchase granting one charge per attempt.
Use npm ci, npm test and npm run build before delivery. Browser smoke requires running dev server and Playwright Chromium.
Never claim real SDK/ad/cloud verification from local tests. Never publish or change monetization/account settings without explicit user authorization.
Do not commit node_modules, dist, preview, artifacts, user saves or reference video.


Current user scope: MVP only. Yandex draft verification, physical-device QA, final economy balance and publication preparation are explicitly deferred. Do not expand this task into release preparation.

Approved 2026-10-27: 45 sparse progressive mines; seven picks; coal/copper accessible to wood; iron, gold, gem, emerald introduced gradually; ×2 for next five ore drops and row clear bonuses. Ore feedback shows provisional earnings for this run; wallet credited on victory. Preserve old wallet/purchases when migrating 12-mine saves.
