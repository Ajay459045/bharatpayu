const { existsSync } = require("fs");
const { spawnSync } = require("child_process");

if (existsSync("dist/main.js")) {
  process.exit(0);
}

console.log("dist/main.js not found; building API before start...");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["run", "build"], {
  cwd: process.cwd(),
  stdio: "inherit"
});

process.exit(result.status ?? 1);
