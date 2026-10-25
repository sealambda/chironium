import { afterEach, describe, expect, it, vi } from "vitest";

import { submitForm } from "@/shared/utils/request-utils";

describe("submitForm", () => {
  afterEach(() => {
    document.head.querySelector("meta[name='csrf-token']")?.remove();
    vi.restoreAllMocks();
  });

  it("sends a DELETE as a POST with _method and the page's CSRF token", () => {
    const meta = document.createElement("meta");
    meta.name = "csrf-token";
    meta.content = "the-csrf-token";
    document.head.append(meta);
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});

    submitForm("/sign-out", "delete");

    const form = submit.mock.contexts[0] as HTMLFormElement;
    expect(form.method).toBe("post");
    expect(new URL(form.action).pathname).toBe("/sign-out");
    expect(new FormData(form).get("_method")).toBe("delete");
    expect(new FormData(form).get("_csrf_token")).toBe("the-csrf-token");
  });
});
