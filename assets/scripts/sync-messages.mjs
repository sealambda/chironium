#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MESSAGES_DIR = path.join(ROOT, "messages");
const SCAN_DIRS = [path.join(ROOT, "src"), path.join(ROOT, "e2e")];
const SOURCE_EXTENSIONS = /\.(tsx?|jsx?|mjs)$/u;
const RESERVED_KEYS = new Set(["$schema"]);
const MESSAGE_IMPORT_PATTERN = /paraglide\/messages/u;
const MESSAGE_KEY_PATTERN = /\bm\.([a-z][a-z0-9_]*)(?:\(|(?=[\s,}:\]\);]|$))/gu;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const check = args.has("--check");

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "paraglide") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, files);
      continue;
    }

    if (SOURCE_EXTENSIONS.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectUsedMessageKeys() {
  const used = new Set();

  for (const dir of SCAN_DIRS) {
    for (const filePath of walkDir(dir)) {
      const content = fs.readFileSync(filePath, "utf8");
      if (!MESSAGE_IMPORT_PATTERN.test(content)) {
        continue;
      }

      for (const match of content.matchAll(MESSAGE_KEY_PATTERN)) {
        used.add(match[1]);
      }
    }
  }

  return used;
}

function listMessageFiles() {
  return fs
    .readdirSync(MESSAGES_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(MESSAGES_DIR, name));
}

function readMessageFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const schema = Object.hasOwn(raw, "$schema") ? raw.$schema : undefined;
  const entries = Object.entries(raw).filter(([key]) => !RESERVED_KEYS.has(key));
  return { schema, entries };
}

function buildSortedMessageObject(schema, entries) {
  const sortedEntries = [...entries].sort(([left], [right]) => left.localeCompare(right));
  const next = {};

  if (schema !== undefined) {
    next.$schema = schema;
  }

  for (const [key, value] of sortedEntries) {
    next[key] = value;
  }

  return next;
}

function serializeMessageObject(object) {
  return `${JSON.stringify(object, null, 2)}\n`;
}

function main() {
  const usedKeys = collectUsedMessageKeys();
  const messageFiles = listMessageFiles();
  const allDefinedKeys = new Set();
  const perFile = new Map();

  for (const filePath of messageFiles) {
    const { schema, entries } = readMessageFile(filePath);
    perFile.set(filePath, { schema, entries });
    for (const [key] of entries) {
      allDefinedKeys.add(key);
    }
  }

  const unusedKeys = [...allDefinedKeys].filter((key) => !usedKeys.has(key)).sort();
  const missingKeys = [...usedKeys].filter((key) => !allDefinedKeys.has(key)).sort();

  let changed = false;
  const updatedFiles = [];

  for (const filePath of messageFiles) {
    const locale = path.basename(filePath, ".json");
    const { schema, entries } = perFile.get(filePath);
    const keptEntries = entries.filter(([key]) => usedKeys.has(key));
    const removedForLocale = entries
      .map(([key]) => key)
      .filter((key) => !usedKeys.has(key))
      .sort();

    const nextObject = buildSortedMessageObject(schema, keptEntries);
    const nextContent = serializeMessageObject(nextObject);
    const previousContent = fs.readFileSync(filePath, "utf8");

    if (nextContent !== previousContent) {
      changed = true;
      updatedFiles.push(locale);

      if (!dryRun && !check) {
        fs.writeFileSync(filePath, nextContent, "utf8");
      }
    }

    if (removedForLocale.length > 0) {
      console.info(`[${locale}] removing ${removedForLocale.length} unused keys`);
      for (const key of removedForLocale) {
        console.info(`  - ${key}`);
      }
    }
  }

  if (unusedKeys.length === 0) {
    console.info("No unused translation keys found.");
  } else {
    console.info(`\nUnused keys across locales (${unusedKeys.length}):`);
    for (const key of unusedKeys) {
      console.info(`  - ${key}`);
    }
  }

  if (missingKeys.length > 0) {
    console.warn(`\nKeys referenced in code but missing from message files (${missingKeys.length}):`);
    for (const key of missingKeys) {
      console.warn(`  - ${key}`);
    }
  }

  if (dryRun) {
    console.info(
      changed
        ? `\nDry run: would update ${updatedFiles.join(", ")}.`
        : "\nDry run: message files are already sorted and contain no unused keys.",
    );
  } else if (check) {
    if (changed) {
      console.error(
        `\nMessage files are out of sync. Run \`pnpm messages:sync\` to sort keys and remove unused translations.`,
      );
      process.exitCode = 1;
    } else {
      console.info("\nMessage files are sorted and contain no unused keys.");
    }
  } else if (changed) {
    console.info(`\nUpdated ${updatedFiles.join(", ")}.`);
  } else {
    console.info("\nMessage files were already sorted and contained no unused keys.");
  }
}

main();
