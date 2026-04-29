import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const AUTH_DIR = path.join(__dirname, "e2e/.auth");
const ARTIFACT_ROOT = path.join(REPO_ROOT, "screenshots");

const DEFAULT_VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "desktop", width: 1440, height: 1024 },
];

function sanitizeSegment(value) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "page";
}

function nowStamp() {
  const iso = new Date().toISOString();
  return iso.replace(/[:.]/g, "-");
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function isPathLike(value) {
  return value.includes("/") || value.includes("\\");
}

function toAbsoluteFromRepo(targetPath) {
  return path.isAbsolute(targetPath) ? targetPath : path.join(REPO_ROOT, targetPath);
}

function resolveScreenshotPath(target) {
  if (isPathLike(target)) {
    return toAbsoluteFromRepo(target);
  }
  return path.join(ARTIFACT_ROOT, `${sanitizeSegment(target)}.png`);
}

function resolveReportPath(fileName) {
  if (isPathLike(fileName)) {
    return toAbsoluteFromRepo(fileName);
  }
  return path.join(ARTIFACT_ROOT, fileName);
}

export function requireAuthState(options = {}) {
  const preferredPath = typeof options === "string" ? options : options.preferredPath;

  if (preferredPath) {
    const resolved = path.isAbsolute(preferredPath)
      ? preferredPath
      : path.resolve(REPO_ROOT, preferredPath);
    if (existsSync(resolved)) {
      return resolved;
    }
    throw new Error(`Auth storage state not found at ${resolved}.`);
  }

  const preferred = [
    path.join(AUTH_DIR, "audit-sso.json"),
    path.join(AUTH_DIR, "review-bot.json"),
  ];

  for (const authPath of preferred) {
    if (existsSync(authPath)) {
      return authPath;
    }
  }

  throw new Error(
    `No auth storage state found. Expected one of: ${preferred.join(", ")}. Run node assets/audit-bot-auth.mjs if needed.`,
  );
}

export async function launchBrowser(options = {}) {
  const { headless = true } = options;
  return chromium.launch({ headless });
}

export async function openPage(browser, options = {}) {
  const {
    storageState,
    authStatePath,
    viewport = { width: 1440, height: 1024 },
    baseURL = "http://localhost:4000",
    locale,
  } = options;

  const resolvedStorageState = storageState ?? authStatePath ?? requireAuthState();

  const context = await browser.newContext({
    storageState: resolvedStorageState,
    baseURL,
    viewport,
    ...(locale ? { locale } : {}),
  });
  const page = await context.newPage();

  return { context, page };
}

export async function navigate(page, url, options = {}) {
  const { waitUntil = "domcontentloaded", timeout = 60_000, returnResponse = false } = options;
  const response = await page.goto(url, { waitUntil, timeout });
  await page.waitForLoadState("networkidle");
  return returnResponse ? response : page.url();
}

export async function snap(page, target, options = {}) {
  const { fullPage = true, locator } = options;
  const outputPath = resolveScreenshotPath(target);
  ensureDir(path.dirname(outputPath));

  if (locator) {
    const screenshotTarget = typeof locator === "string" ? page.locator(locator).first() : locator;
    await screenshotTarget.screenshot({ path: outputPath });
    return outputPath;
  }

  await page.screenshot({ path: outputPath, fullPage });
  return outputPath;
}

export async function snapViewports(page, options = {}) {
  const {
    label,
    outDir,
    viewports = DEFAULT_VIEWPORTS,
    fullPage = true,
  } = options;

  const results = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const filename = `${sanitizeSegment(label)}-${viewport.name}-${viewport.width}x${viewport.height}.png`;
    const screenshotPath = path.join(outDir, filename);
    await snap(page, screenshotPath, { fullPage });
    results.push({
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      screenshotPath,
    });
  }

  return results;
}

export async function captureOverlay(page, nameOrOptions, maybeOptions = {}) {
  if (typeof nameOrOptions === "object" && nameOrOptions !== null) {
    const legacyOptions = nameOrOptions;
    const {
      outDir,
      label,
      selector = '[role="dialog"], [data-state="open"], [aria-modal="true"]',
    } = legacyOptions;

    const overlays = page.locator(selector);
    const count = await overlays.count();

    if (count === 0) {
      return [];
    }

    const captures = [];
    for (let index = 0; index < count; index += 1) {
      const overlay = overlays.nth(index);
      const box = await overlay.boundingBox();
      if (!box) {
        continue;
      }
      const filename = `${sanitizeSegment(label)}-overlay-${index + 1}.png`;
      const screenshotPath = path.join(outDir, filename);
      ensureDir(path.dirname(screenshotPath));
      await page.screenshot({ path: screenshotPath, clip: box });
      captures.push({ index, screenshotPath });
    }

    return captures;
  }

  const name = nameOrOptions;
  const {
    open,
    close,
    settleMs = 350,
    fullPage = true,
    locator,
  } = maybeOptions;

  if (open) {
    await open(page);
  }

  if (settleMs > 0) {
    await page.waitForTimeout(settleMs);
  }

  const screenshotPath = await snap(page, name, { fullPage, locator });

  if (close) {
    await close(page);
  }

  return screenshotPath;
}

export async function discoverCustomerIds(page) {
  const ids = await page.evaluate(() => {
    const found = new Set();
    const anchors = Array.from(document.querySelectorAll("a[href*='/customers/']"));
    for (const anchor of anchors) {
      const href = anchor.getAttribute("href") || "";
      const match = href.match(/\/customers\/([^/?#]+)/i);
      if (!match || !match[1]) {
        continue;
      }
      const id = decodeURIComponent(match[1]).trim();
      if (id && id.toLowerCase() !== "new") {
        found.add(id);
      }
    }
    return Array.from(found);
  });

  return ids;
}

export async function domInventory(page, options = {}) {
  const { scope = "page", limit = 40 } = options;

  const inventory = await page.evaluate(() => {
    const bySelector = (selector) => document.querySelectorAll(selector).length;

    return {
      pathname: window.location.pathname,
      feed: {
        articles: bySelector("article"),
        pills: bySelector("article span.rounded-full"),
        notes: bySelector("article p"),
        markdownBlocks: bySelector("article p strong, article p em, article ul, article ol"),
      },
      tags: {
        tagColumns: bySelector("[class*='space-y-3']"),
        pillLikeTags: bySelector("span.rounded-full.border"),
      },
    };
  });

  const detailed = await page.evaluate(({ scopeLabel, itemLimit }) => {
    const normalize = (text) => text.replace(/\s+/g, " ").trim();
    const take = (nodes) => Array.from(nodes).slice(0, itemLimit);

    return {
      scope: scopeLabel,
      url: window.location.href,
      title: document.title,
      generatedAt: new Date().toISOString(),
      headings: take(document.querySelectorAll("h1, h2, h3, h4")).map((node) => ({
        tag: node.tagName.toLowerCase(),
        text: normalize(node.textContent || ""),
      })),
      buttons: take(document.querySelectorAll("button")).map((node) => ({
        text: normalize(node.textContent || ""),
        ariaLabel: node.getAttribute("aria-label"),
        disabled: node.hasAttribute("disabled"),
      })),
      links: take(document.querySelectorAll("a[href]"))
        .map((node) => ({
          text: normalize(node.textContent || ""),
          href: node.getAttribute("href"),
        }))
        .filter((entry) => entry.href),
      feedEvents: take(document.querySelectorAll("article"))
        .map((node) => {
          const body = normalize(node.textContent || "");
          if (!body) {
            return null;
          }

          return {
            label: normalize(node.querySelector("span.rounded-full")?.textContent || ""),
            time: node.querySelector("time")?.getAttribute("datetime") || null,
            body: body.slice(0, 280),
          };
        })
        .filter(Boolean),
    };
  }, { scopeLabel: scope, itemLimit: limit });

  return { ...inventory, ...detailed };
}

export function saveReport(firstArg, secondArg = {}) {
  if (typeof firstArg === "string") {
    const fileName = firstArg;
    const data = secondArg;
    const reportPath = resolveReportPath(fileName);
    ensureDir(path.dirname(reportPath));
    const content = typeof data === "string" ? data : `${JSON.stringify(data, null, 2)}\n`;
    writeFileSync(reportPath, content, "utf8");
    return reportPath;
  }

  const report = firstArg;
  const options = secondArg;
  const { outDir = path.join(ARTIFACT_ROOT, "visual-audit"), filename = `report-${nowStamp()}.json` } = options;
  ensureDir(outDir);
  const reportPath = path.join(outDir, filename);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}

export function buildRunPaths(options = {}) {
  const { runId = nowStamp() } = options;
  const runDir = ensureDir(path.join(ARTIFACT_ROOT, "visual-audit", runId));
  const screenshotsDir = ensureDir(path.join(runDir, "screens"));
  const reportsDir = ensureDir(path.join(runDir, "reports"));
  return { runId, runDir, screenshotsDir, reportsDir };
}
