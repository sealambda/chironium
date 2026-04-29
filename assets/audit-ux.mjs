import {
  captureOverlay,
  domInventory,
  launchBrowser,
  navigate,
  openPage,
  requireAuthState,
  saveReport,
  snap,
} from "./audit-lib.mjs";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000";
const TARGET_URLS = ["/customers", "/customers/$customerId"];

function summarizeFocusNode(node) {
  return {
    step: node.step,
    tag: node.tag,
    role: node.role,
    id: node.id,
    name: node.name,
    text: node.text,
  };
}

function buildMarkdownReport(data) {
  const scoreLines = data.heuristics
    .map((item) => `- ${item.heuristic}: ${item.score}/10 - ${item.rationale}`)
    .join("\n");

  const journeyRows = data.journey
    .map(
      (step, index) =>
        `${index + 1}. ${step.step} | ${step.userGoal} | ${step.friction} | ${step.recommendation}`,
    )
    .join("\n");

  const recommendationLines = data.recommendations.map((item) => `- ${item}`).join("\n");

  return [
    "## UX & Interaction Plan",
    "",
    "### Nielsen Heuristic Scores (Intent Scope)",
    scoreLines,
    "",
    "### Journey Map",
    "Step | User Goal | Friction | Recommendation",
    "--- | --- | --- | ---",
    journeyRows
      .split("\n")
      .map((row) => row.replace(/^\d+\.\s/, ""))
      .join("\n"),
    "",
    "### Interaction Recommendations",
    recommendationLines,
    "",
    "### Evidence",
    `- Snapshots: ${data.snapshots.join(", ")}`,
    `- Focus order sample: ${data.focusOrder.map((item) => `${item.step}:${item.tag}`).join(", ")}`,
    `- Intent checks: ${JSON.stringify(data.intentChecks)}`,
  ].join("\n");
}

async function discoverCustomerId(page) {
  const hrefs = await page
    .locator('a[href*="/customers/"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") || ""));

  for (const href of hrefs) {
    const match = href.match(/\/customers\/([^/?#]+)/);
    const customerId = match?.[1];
    if (customerId && customerId !== "$customerId") {
      return customerId;
    }
  }

  return null;
}

async function collectFocusOrder(page, maxSteps = 18) {
  const focusOrder = [];
  const visited = new Set();

  for (let index = 1; index <= maxSteps; index += 1) {
    await page.keyboard.press("Tab");

    const active = await page.evaluate((step) => {
      const el = document.activeElement;
      if (!el) {
        return null;
      }

      const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
      const ariaLabel = el.getAttribute("aria-label") || "";
      const name = (ariaLabel || text).trim();

      return {
        step,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role") || null,
        id: el.id || null,
        name: name || null,
        text: text || null,
      };
    }, index);

    if (!active) {
      continue;
    }

    const signature = `${active.tag}|${active.id || ""}|${active.name || ""}`;
    if (visited.has(signature)) {
      break;
    }

    visited.add(signature);
    focusOrder.push(active);
  }

  return focusOrder;
}

async function evaluateIntent(page) {
  return page.evaluate(() => {
    const normalize = (text) => text.replace(/\s+/g, " ").trim();
    const eventCards = Array.from(document.querySelectorAll("article"));

    const duplicatedGoalPhrase = eventCards.some((card) => {
      const text = normalize(card.textContent || "").toLowerCase();
      return (
        text.includes("establecio un objetivo establecido") ||
        text.includes("estableció un objetivo establecido") ||
        text.includes("set a goal set")
      );
    });

    const noteCards = eventCards.filter((card) => {
      const label = normalize(card.querySelector("span.rounded-full")?.textContent || "").toLowerCase();
      return label === "nota" || label === "note";
    });

    const noteHasMarkdown = noteCards.some((card) =>
      card.querySelector("em, strong, ul, ol, a, blockquote, code, pre"),
    );

    const noteIsJustified = noteCards.every((card) => {
      if (noteCards.length === 0) {
        return false;
      }
      const paragraphs = Array.from(card.querySelectorAll("p"));
      if (paragraphs.length === 0) {
        return false;
      }
      return paragraphs.every((paragraph) => {
        const style = window.getComputedStyle(paragraph);
        return style.textAlign === "justify";
      });
    });

    const pillNodes = Array.from(document.querySelectorAll("article span.rounded-full"));
    const nonUppercasePills = pillNodes
      .map((node) => {
        const text = normalize(node.textContent || "");
        const style = window.getComputedStyle(node);
        return {
          text,
          textTransform: style.textTransform,
          fontVariantCaps: style.fontVariantCaps,
          isUppercaseText: text === text.toUpperCase(),
        };
      })
      .filter((pill) => pill.text.length > 0 && !pill.isUppercaseText);

    const eventKeys = eventCards
      .map((card) => {
        const datetime = card.querySelector("time")?.getAttribute("datetime") || "";
        const label = normalize(card.querySelector("span.rounded-full")?.textContent || "");
        if (!datetime || !label) {
          return null;
        }
        return `${label}|${datetime.slice(0, 16)}`;
      })
      .filter(Boolean);

    const counts = new Map();
    for (const key of eventKeys) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const duplicateMinuteEvents = Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([key, count]) => ({ key, count }));

    return {
      duplicatedGoalPhrase,
      noteHasMarkdown,
      noteIsJustified,
      nonUppercasePills,
      duplicateMinuteEvents,
      totalEventCards: eventCards.length,
      noteCardCount: noteCards.length,
    };
  });
}

function heuristicScores(intentChecks) {
  return [
    {
      heuristic: "Match between system and real world",
      score: intentChecks.duplicatedGoalPhrase ? 4 : 9,
      rationale: intentChecks.duplicatedGoalPhrase
        ? "Goal-created copy duplicates the noun phrase and reads as unnatural language."
        : "Goal-created copy is concise and natural.",
    },
    {
      heuristic: "Consistency and standards",
      score: intentChecks.nonUppercasePills.length > 0 ? 5 : 9,
      rationale:
        intentChecks.nonUppercasePills.length > 0
          ? "Feed pills are mixed case instead of a single uppercase or small-caps convention."
          : "Feed pills follow one consistent casing convention.",
    },
    {
      heuristic: "Aesthetic and minimalist design",
      score: intentChecks.duplicatedGoalPhrase || intentChecks.nonUppercasePills.length > 0 ? 6 : 9,
      rationale:
        intentChecks.duplicatedGoalPhrase || intentChecks.nonUppercasePills.length > 0
          ? "Text and label hierarchy create avoidable visual noise in the feed header row."
          : "Visual hierarchy is compact and semantically clean.",
    },
    {
      heuristic: "Recognition rather than recall",
      score: intentChecks.noteHasMarkdown ? 9 : 5,
      rationale: intentChecks.noteHasMarkdown
        ? "Notes preserve familiar markdown structures that users can scan quickly."
        : "Notes flatten markdown syntax into plain text, reducing scanability and structure recognition.",
    },
    {
      heuristic: "Flexibility and efficiency of use",
      score: intentChecks.duplicateMinuteEvents.length > 0 ? 5 : 8,
      rationale:
        intentChecks.duplicateMinuteEvents.length > 0
          ? "Simultaneous records are split into repeated cards, increasing scroll and interpretation cost."
          : "Simultaneous records are grouped, reducing repeated scanning overhead.",
    },
    {
      heuristic: "Visibility of system status",
      score: 7,
      rationale:
        "Feed surfaces explicit empty/error states, but intent-specific grouping and label semantics remain partially ambiguous.",
    },
  ];
}

async function run() {
  const authStatePath = await requireAuthState({
    preferredPath: "assets/e2e/.auth/review-bot.json",
  });
  const browser = await launchBrowser();
  const snapshots = [];

  try {
    const { context, page } = await openPage(browser, {
      baseURL: BASE_URL,
      authStatePath,
    });

    const reports = {
      baseUrl: BASE_URL,
      generatedAt: new Date().toISOString(),
      targetUrls: [],
      focusOrder: [],
      snapshots,
      intentChecks: null,
      heuristics: [],
      journey: [],
      recommendations: [],
    };

    const customersUrl = TARGET_URLS[0];
    reports.targetUrls.push(await navigate(page, customersUrl));
    snapshots.push(await snap(page, "audit-ux-customers-fold", { fullPage: false }));
    snapshots.push(await snap(page, "audit-ux-customers-full", { fullPage: true }));

    const customersInventory = await domInventory(page, { scope: "customers-list" });

    const customerId = await discoverCustomerId(page);
    if (!customerId) {
      throw new Error("Could not discover a customerId from /customers links.");
    }

    const detailUrl = TARGET_URLS[1].replace("$customerId", customerId);
    reports.targetUrls.push(await navigate(page, detailUrl));

    snapshots.push(await snap(page, "audit-ux-customer-detail-fold", { fullPage: false }));
    snapshots.push(await snap(page, "audit-ux-customer-detail-full", { fullPage: true }));

    reports.focusOrder = (await collectFocusOrder(page)).map(summarizeFocusNode);
    snapshots.push(await snap(page, "audit-ux-customer-detail-focus", { fullPage: false }));

    const feedPill = page.locator("article span.rounded-full").first();
    if ((await feedPill.count()) > 0) {
      await feedPill.hover();
      snapshots.push(await snap(page, "audit-ux-customer-detail-hover-pill", { fullPage: false }));
    }

    const addButton = page.getByRole("button", { name: /add|añadir/i }).first();
    if ((await addButton.count()) > 0) {
      snapshots.push(
        await captureOverlay(page, "audit-ux-customer-detail-open-state", {
          open: async () => {
            await addButton.click();
          },
          close: async (currentPage) => {
            await currentPage.keyboard.press("Escape");
          },
          fullPage: false,
        }),
      );
    }

    const detailInventory = await domInventory(page, { scope: "customer-detail" });
    reports.intentChecks = await evaluateIntent(page);
    reports.heuristics = heuristicScores(reports.intentChecks);

    const abortGraphql = (route) => route.abort("failed");
    await context.route("**/gql", abortGraphql);
    snapshots.push(
      await captureOverlay(page, "audit-ux-customer-detail-error-state", {
        open: async (currentPage) => {
          await currentPage.reload({ waitUntil: "domcontentloaded" });
        },
        fullPage: false,
      }),
    );
    await context.unroute("**/gql", abortGraphql);
    await navigate(page, detailUrl);

    reports.journey = [
      {
        step: "Open customer list",
        userGoal: "Find a customer and open profile.",
        friction: "Low when links are visible and keyboard focus order remains predictable.",
        recommendation: "Keep first interactive controls reachable within first 5 Tab stops.",
      },
      {
        step: "Scan activity feed event headers",
        userGoal: "Understand who did what quickly.",
        friction: reports.intentChecks.duplicatedGoalPhrase
          ? "Goal-created phrase duplicates wording and slows comprehension."
          : "No copy duplication detected.",
        recommendation: "Use concise verb + label pair (e.g. establecio un Objetivo).",
      },
      {
        step: "Read note content",
        userGoal: "Parse clinical note structure and key details.",
        friction: !reports.intentChecks.noteHasMarkdown
          ? "Markdown structure is flattened, reducing scannability."
          : "Markdown structure renders correctly.",
        recommendation: "Render markdown and apply justified body text in note content blocks.",
      },
      {
        step: "Review tag and record clusters",
        userGoal: "Recognize categories and avoid duplicate feed noise.",
        friction:
          reports.intentChecks.nonUppercasePills.length > 0 ||
          reports.intentChecks.duplicateMinuteEvents.length > 0
            ? "Casing inconsistency and split same-minute records increase cognitive load."
            : "Tags and grouped records are easy to scan.",
        recommendation: "Apply uppercase or small-caps pill styles and merge same-minute records.",
      },
    ];

    reports.recommendations = [
      "Replace duplicated goal-created phrase so event headers read as actor + verb + concise label.",
      "Render note bodies as markdown and set note paragraph alignment to justify for scan consistency.",
      "Normalize feed pill text to uppercase or small-caps to reinforce category recognition.",
      "Group records with same event type and minute timestamp into one feed card.",
    ];

    await saveReport("audit-ux-dom-inventory.json", {
      customers: customersInventory,
      detail: detailInventory,
    });

    await saveReport("audit-ux-report.json", reports);
    const markdown = buildMarkdownReport(reports);
    await saveReport("audit-ux-report.md", markdown);

    console.info("[audit-ux] Completed.");
    console.info("[audit-ux] Saved screenshots and reports to screenshots/.");
  } finally {
    await browser.close();
  }
}

await run();
