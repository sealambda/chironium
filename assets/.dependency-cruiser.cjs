/**
 * dependency-cruiser — architecture gate for the chironium frontend.
 * Starts with no-circular / no-orphans / dev-dep hygiene; the feature-boundary
 * rule below keeps each `features/<x>` slice from reaching into another slice's
 * internals. Run: `pnpm arch` (from assets/). Docs: https://github.com/sverweij/dependency-cruiser
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "Circular dependencies make code hard to reason about and defeat tree-shaking. Break the cycle.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "error",
      comment:
        "Orphaned modules (nothing imports them) are usually dead code — delete them.",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)src/main\\.tsx$",
          "(^|/)js/app\\.js$",
          "\\.(config|setup)\\.[cm]?[jt]s$",
          "(^|/)src/routes/", // route modules are entry points (loaded via routeTree.gen.ts)
          "(^|/)src/test/", // test helpers/setup (loaded by vitest config + excluded test files)
        ],
      },
      to: {},
    },
    {
      name: "no-deprecated-core",
      severity: "error",
      comment: "Don't depend on deprecated Node core modules.",
      from: {},
      to: {
        dependencyTypes: ["core"],
        path: ["^(v8/tools/codemap)$", "^(punycode|sys|domain)$"],
      },
    },
    {
      name: "not-to-dev-dep",
      severity: "error",
      comment: "Production source must not import devDependencies.",
      from: { path: "^src", pathNot: "\\.(test|spec)\\.(ts|tsx)$" },
      to: { dependencyTypes: ["npm-dev"], pathNot: ["node_modules/@types/"] },
    },
    {
      name: "no-cross-feature-internals",
      severity: "error",
      comment:
        "Features talk only via shared/ or another feature's designated public API module.",
      from: { path: "^src/features/([^/]+)/" },
      to: {
        path: "^src/features/([^/]+)/",
        pathNot: [
          "^src/features/$1/", // same feature
          "^src/features/tasks/api/tasks-api\\.ts$", // public: task events in activity feed
          "^src/features/practitioners/api/practitioners-api\\.ts$", // public: practitioner lookups
          "^src/features/customers/api/subscriptions-api\\.ts$", // public: org subscriptions page
          "^src/features/customers/utils/person-detail-cache\\.ts$", // public: refresh a person after mutations
          "^src/features/customers/ui/detail/activity-feed/questionnaire-request-event\\.tsx$", // public: request summary on the pending page
          // Public: questionnaire requests and responses in the activity feed and pending page.
          "^src/features/questionnaires/api/questionnaire-(requests|responses)-api\\.ts$",
          "^src/features/questionnaires/model/questionnaire-request-status\\.ts$",
          "^src/features/questionnaires/ui/request/(questionnaire-request-actions|questionnaire-link-dialog|send-questionnaire-dialog)\\.tsx$",
          "^src/features/questionnaires/ui/fill/questionnaire-fill-dialog\\.tsx$",
          "^src/features/questionnaires/ui/detail/response-answers\\.tsx$",
        ],
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: [
        "node_modules",
        "(^|/)src/paraglide/",
        "(^|/)src/routeTree\\.gen\\.ts",
        "(^|/)src/graphql-env\\.d\\.ts",
        "\\.(test|spec)\\.(ts|tsx)$",
        "(^|/)e2e/",
      ],
    },
    tsConfig: { fileName: "tsconfig.app.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
  },
};
