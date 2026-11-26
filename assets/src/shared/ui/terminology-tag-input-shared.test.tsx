import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { searchTerminologySuggestions } from "@/features/customers/api/terminology-api";

import { useTerminologyTagSearchField } from "./terminology-tag-input-shared";

vi.mock("@/features/customers/api/terminology-api", () => ({
  searchTerminologySuggestions: vi.fn(),
}));

function renderSearchField() {
  return renderHook(() =>
    useTerminologyTagSearchField({ organizationId: "org-1", conceptContext: "CONDITION" }),
  );
}

describe("useTerminologyTagSearchField", () => {
  afterEach(() => vi.clearAllMocks());

  it("keeps the menu closed while searching and when nothing is found", async () => {
    vi.mocked(searchTerminologySuggestions).mockResolvedValue([]);
    const { result } = renderSearchField();

    act(() => result.current.onInputChange("diabetes"));
    expect(result.current.showMenu).toBe(false);

    await waitFor(() => expect(searchTerminologySuggestions).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(result.current.showMenu).toBe(false);
  });

  it("opens the menu when the search finds suggestions", async () => {
    vi.mocked(searchTerminologySuggestions).mockResolvedValue([
      { code: "73211009", system: "http://snomed.info/sct", label: "Diabetes mellitus" },
    ]);
    const { result } = renderSearchField();

    act(() => result.current.onInputChange("diabetes"));

    await waitFor(() => expect(result.current.showMenu).toBe(true));
  });
});
