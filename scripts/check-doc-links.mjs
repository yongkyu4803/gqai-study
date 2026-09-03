import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "playwright-report",
  "test-results",
]);

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

const failures = [];
for (const file of markdownFiles(root)) {
  const source = readFileSync(file, "utf8");
  const links = source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);
  for (const match of links) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (
      !rawTarget ||
      rawTarget.startsWith("#") ||
      /^(?:https?:|mailto:|tel:)/i.test(rawTarget)
    )
      continue;
    const withoutAnchor = rawTarget.split("#", 1)[0];
    const target = resolve(dirname(file), decodeURIComponent(withoutAnchor));
    if (
      !existsSync(target) ||
      (!statSync(target).isFile() && !statSync(target).isDirectory())
    ) {
      failures.push(`${file.slice(root.length + 1)} -> ${rawTarget}`);
    }
  }
}

if (failures.length) {
  process.stderr.write(`깨진 로컬 문서 링크:\n${failures.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write("Local Markdown links: PASS\n");
