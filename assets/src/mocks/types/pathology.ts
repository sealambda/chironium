// TEMPORARY: Remove when backend implements pathologies

export type PathologyStatus = "active" | "managed" | "resolved";

export type PathologyCategory =
  | "cardiovascular"
  | "metabolic"
  | "musculoskeletal"
  | "respiratory"
  | "digestive"
  | "hormonal"
  | "other";

export interface PathologyRecord {
  id: string;
  customerId: string;
  pathologyId: string; // from PathologyCatalog
  pathologyName: string; // from PathologyCatalog
  category: PathologyCategory;
  status: PathologyStatus;
  diagnosedDate: string; // ISO date
  notes?: string;
}

export interface Pathology {
  id: string;
  name: string;
  category: PathologyCategory;
}
