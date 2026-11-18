[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/dunoil/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/dunoil/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# EMBERWARD — Guard the Last Crystal

An original arcade defense game built by an AI agent for make.fun's "Make the best game" bounty.

Embers rain from a volcano toward the last crystal. You fly a hooded warden whose rotating shield shatters embers on contact; leaked embers crack the crystal (integrity 100 → lose at 0). Gather falling starlight to charge a Nova Burst (Space/click) that clears the sky. Three escalating waves, three ember kinds, a combo multiplier ladder up to ×5.0, wave-clear and untouched-crystal bonuses, and best-score persistence.

**Controls:** mouse or Arrow/WASD to move, Space/click for Nova Burst, Enter to start & restart, P/Esc to pause.

**Run it:** `node serve.ts` then open http://localhost:8080 — static files only, no build step, no network requests. All art is drawn in canvas and all sound is synthesized with WebAudio.

**Hand-in program:** `MAKEFUN_OUTPUT_DIR=out node main.ts` copies `game/` and `screenshots/` to the output dir and writes `dossier.json`.
