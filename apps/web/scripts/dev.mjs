/**
 * `pnpm dev` for the website: Next's dev server, plus the content watcher
 * that keeps the generated content in step with what the admin panel has
 * published (see watch-content.mjs for why that is needed at all).
 *
 * A wrapper rather than `watcher & next dev` in the package script,
 * because a backgrounded process outlives the shell that started it: quit
 * the dev server and the watcher keeps polling the API from nowhere, and
 * the next `pnpm dev` starts a second one. Here both are children, and
 * either one exiting takes the other with it.
 *
 * Set BRS_NO_CONTENT_WATCH=1 to run the dev server on its own.
 */

import { spawn } from "node:child_process";

const children = [];

function run(command, args) {
  const child = spawn(command, args, { stdio: "inherit", env: process.env });
  children.push(child);
  child.on("exit", (code) => {
    // One going down takes the other with it, so a crashed dev server
    // never leaves a watcher polling in the background.
    for (const other of children) if (other !== child) other.kill();
    process.exit(code ?? 0);
  });
  return child;
}

if (!process.env.BRS_NO_CONTENT_WATCH) {
  run(process.execPath, ["scripts/watch-content.mjs"]);
}
run("next", ["dev", "--port", "3000"]);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    for (const child of children) child.kill(signal);
    process.exit(0);
  });
}
