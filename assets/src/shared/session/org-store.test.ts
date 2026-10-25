import { afterEach, describe, expect, it } from "vitest";

import type { OrganizationRecord } from "@/features/org/api/org-api";
import { storePreference } from "@/features/org/model/org-preferences";
import { useOrgStore } from "@/shared/session/org-store";

const org = (id: string) => ({ id }) as OrganizationRecord;

function sync(availableOrgs: OrganizationRecord[]) {
  useOrgStore.getState().setFromQuery({ availableOrgs, loading: false, error: null });
  return useOrgStore.getState().selectedOrg?.id;
}

describe("useOrgStore", () => {
  afterEach(() => {
    storePreference(null);
    useOrgStore.setState({ selectedOrg: null });
  });

  it("selects the preferred organization", () => {
    storePreference("second");

    expect(sync([org("first"), org("second")])).toBe("second");
  });

  it("selects the first organization when the preferred one no longer exists", () => {
    storePreference("deleted-demo-org");

    expect(sync([org("new-demo-org")])).toBe("new-demo-org");
  });
});
