import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchAvailableConceptContexts,
  searchTerminologySuggestions,
} from "@/features/customers/api/terminology-api";
import { createTestQueryClient } from "@/test/render-with-query-client";

import { useTerminologyTagSearchField } from "./terminology-tag-input-shared";

vi.mock("@/features/customers/api/terminology-api", () => ({
  fetchAvailableConceptContexts: vi.fn(),
  searchTerminologySuggestions: vi.fn(),
}));

function renderSearchField(conceptContext: "CONDITION" | "LAB_RESULT") {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    () => useTerminologyTagSearchField({ organizationId: "org-1", conceptContext }),
    {
      wrapper,
    },
  );
}

describe("useTerminologyTagSearchField", () => {
  afterEach(() => vi.clearAllMocks());

  it("skips the search when the context's code system is not loaded", async () => {
    vi.mocked(fetchAvailableConceptContexts).mockResolvedValue(["LAB_RESULT"]);
    const { result } = renderSearchField("CONDITION");
    await waitFor(() => expect(fetchAvailableConceptContexts).toHaveBeenCalled());

    act(() => result.current.onInputChange("diabetes"));

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(searchTerminologySuggestions).not.toHaveBeenCalled();
    expect(result.current.showMenu).toBe(false);
  });

  it("searches when the context's code system is loaded", async () => {
    vi.mocked(fetchAvailableConceptContexts).mockResolvedValue(["LAB_RESULT"]);
    vi.mocked(searchTerminologySuggestions).mockResolvedValue([]);
    const { result } = renderSearchField("LAB_RESULT");

    act(() => result.current.onInputChange("glucose"));

    await waitFor(() => expect(searchTerminologySuggestions).toHaveBeenCalled());
  });
});
