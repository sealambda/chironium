export interface TerminologyCoding {
  system: string;
  code: string;
  version?: string | null;
  display?: string | null;
}

export interface TerminologyTag {
  label: string;
  coding?: TerminologyCoding;
}
