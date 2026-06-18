// Conventional Commits — enforced in the commit-msg hook (lefthook).
// https://www.conventionalcommits.org/ · https://commitlint.js.org/
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Long lines are common in bodies/footers (URLs, IDs, Co-Authored-By trailers).
    "body-max-line-length": [0, "always"],
    "footer-max-line-length": [0, "always"],
  },
};
