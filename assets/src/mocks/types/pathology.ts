// TEMPORARY: Remove when backend implements pathologies

export type PathologyStatus = "active" | "chronic" | "resolved";

export interface PathologyRecord {
  id: string;
  customerId: string;
  pathologyId: string; // from PathologyCatalog
  pathologyName: string; // from PathologyCatalog
  status: PathologyStatus;
  diagnosedDate?: string; // ISO date — undefined if unknown
  resolvedDate?: string; // ISO date — undefined if unknown or ongoing
  diagnosedDateUnknown?: boolean;
  resolvedDateUnknown?: boolean;
  notes?: string;
}

export interface PathologyCatalogEntry {
  id: string;
  name: string;
  isChronic: boolean;
  genderScope: "BOTH" | "FEMALE_ONLY" | "MALE_ONLY";
}
