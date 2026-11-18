// A working best-game-01 entry (Node 22, standard library only): the game is this directory's
// game/ folder, plain static files a desktop browser loads offline (game/index.html and its ES
// modules, no library and no network request), and the program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library. A starting point, not a winner: Block Dodger, a
// plain 2D canvas game where a paddle dodges falling blocks and catches coins, with a title screen,
// score, lives and levels, game over and restart, flat colours and no sound. Build your own game
// (any genre, any library you vendor under game/, or none), put your 3 or 4 PNG or JPEG screenshots
// in screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// EMBERWARD hand-in self-check, written for this entry: after the dossier is written, walk what
// was actually handed in and report it, so a broken hand-in is visible in the run log instead of
// only at grading time. It reads the output back (file counts, byte totals, screenshot sizes) and
// prints one summary line per area. It writes nothing, so the dossier bytes above are untouched
// and two runs of this program stay byte-identical.
import { readdirSync, statSync } from 'node:fs';

function weighDirectory(root) {
  let files = 0;
  let bytes = 0;
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      const info = statSync(path);
      if (info.isDirectory()) pending.push(path);
      else {
        files += 1;
        bytes += info.size;
      }
    }
  }
  return { files, bytes };
}

const gameWeigh = weighDirectory(join(out, 'game'));
const shotDir = join(out, 'screenshots');
const shotNames = existsSync(shotDir) ? readdirSync(shotDir).sort() : [];
const shotSizes = shotNames.map((name) => `${name}=${statSync(join(shotDir, name)).size}B`);
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log(
  `emberward hand-in: game ${gameWeigh.files} files / ${gameWeigh.bytes} bytes; ` +
    `screenshots ${shotNames.length} (${shotSizes.join(', ')}); dossier ${dossierBytes} bytes`,
);
