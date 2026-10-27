# Mining Progression Implementation Plan
Approved by user: 45 increasingly deep sparse mines, seven picks including obsidian/netherite, coal/copper/iron, ore feedback, ×2 for next five ore blocks, row clearing, reference-shaped artwork. MVP scope only.

Architecture: existing deterministic core + Phaser renderer + DOM UI; preserve recent collider, TNT fuse, tier, audio and tutorial work. No SDK/release expansion.

## Rules
- Picks: wood 0, stone 1, iron 2, gold 3, diamond/obsidian/netherite 4 nudges. Prices and strength increase; gold stays a fast soft-rock specialist.
- 45 reproducible maps in five chapters of nine; first is short. More air and isolated ores, rather than a solid ore wall.
- Coal/copper mine with wood, iron with stone, gold with stone, gem with iron; later emerald with diamond. Current ore total is credited on victory, failure never subtracts the wallet.
- Double block sets five doubled ore drops, not a timer; no stacking beyond five. Sweep clears its row, respects blastproof rock and pick tier for drops, can light TNT.
- Existing wallet/purchases/unlocks/bests migrate from 12 to 45 entries; obsolete active geometry restarts safely. Result receipts stay idempotent.
- Reference: user-provided pick silhouette; original pixel artwork with seven palettes, no imported game assets.

## Tasks and verification
- [ ] Write/run failing progression tests: 45 maps, early ores, seven shared nudge budgets, bonus chaining/once-only, row boundaries and legacy migration.
- [ ] Core: extend block/pick catalog, map progression, fixed seed holes, ore and bonus effects. Retain independent physics and fuse delays.
- [ ] Economy/storage: affordable first upgrade, smooth rewards across 45 mines, old saves migrate, bonus counters survive reload.
- [ ] Renderer/UI: reference-shaped sprite and icons, mineral palettes, per-ore +N labels, HUD flash and ×2 counter; 45-mine chapter selector.
- [ ] Full unit suite/build; browser first win/shop, bonus effects, desktop/mobile, reload; update handoff.
- [ ] Fresh code review; fix important findings; commit and push feature branch. Main is unchanged until merge is requested.

Review focus: legacy savings; bounded bonus cascades; stronger gear and reachable first upgrades; all counts derive from LEVELS; early guaranteed ore is mineable by wood; pixel silhouette and hitbox alignment.
