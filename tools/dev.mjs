import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const processes = [
  { name: "server", cwd: "server", args: ["run", "dev"] },
  { name: "web", cwd: "web", args: ["run", "dev"] },
];

let shuttingDown = false;

function startProcess({ name, cwd, args }) {
  const child = spawn(npmCommand, args, {
    cwd,
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`[dev] ${name} stopped with ${reason}; shutting down.`);
    stopAll();
    process.exit(code ?? 1);
  });

  return child;
}

const children = processes.map(startProcess);

function stopAll() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", () => {
  shuttingDown = true;
  stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shuttingDown = true;
  stopAll();
  process.exit(0);
});
