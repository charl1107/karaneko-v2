/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("node:child_process");
const { resolve } = require("node:path");

const workspaceRoot = resolve(__dirname, "..");
const nextBin = resolve(workspaceRoot, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    CLOUDFLARE_DEV_PLATFORM: "1",
    XDG_CONFIG_HOME: resolve(workspaceRoot, ".wrangler", "xdg.config"),
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
