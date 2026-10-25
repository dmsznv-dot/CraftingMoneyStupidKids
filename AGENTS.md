# Instructions for coding agents
Read HANDOFF.md, docs/GAME_SPEC.md and QA.md before changing behavior.
This is a local playable MVP, not a verified Yandex Games release.
Use a separate task branch. Preserve other agents' changes; no force-push.
Keep simulation in src/core.ts independent from Phaser rendering and SDK.
Do not change the approved nudge rule: wood/stone/iron/gold/diamond = 0/1/2/3/4 per attempt, one shared budget for left/right, no ad refills.
Permanent purchases are deterministic, failures never subtract saved currency, rewarded remains optional.
Only one enchantment active. Starter TNT is a permanent purchase granting one charge per attempt.
Use npm ci, npm test and npm run build before delivery. Browser smoke requires running dev server and Playwright Chromium.
Never claim real SDK/ad/cloud verification from local tests. Never publish or change monetization/account settings without explicit user authorization.
Do not commit node_modules, dist, preview, artifacts, user saves or reference video.
