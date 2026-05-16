const { readdirSync, readFileSync, statSync } = require("fs");
const { join } = require("path");

const root = join(__dirname, "..", "src");
const forbidden = [
  ["localhost", "4000"].join(":"),
  ["http://", "localhost"].join(""),
  ["http://", "127.0.0.1"].join(""),
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      yield* walk(path);
      continue;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      yield path;
    }
  }
}

const matches = [];

for (const file of walk(root)) {
  const content = readFileSync(file, "utf8");

  for (const value of forbidden) {
    if (content.includes(value)) {
      matches.push(`${file}: contains ${value}`);
    }
  }
}

if (matches.length > 0) {
  console.error("Production API URL guard failed.");
  console.error("Do not commit localhost or insecure API fallbacks in frontend source.");
  console.error(matches.join("\n"));
  process.exit(1);
}
