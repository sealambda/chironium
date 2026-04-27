---
description: "Use when adding or changing FHIR-inspired resources, attributes, datatypes, and terminology mappings in health, CRM, or terminology domains."
applyTo: "lib/chironium/health/**/*.ex, lib/chironium/crm/**/*.ex, lib/chironium/datatypes/**/*.ex, lib/chironium/terminology/**/*.ex"
---
# FHIR-Aligned Modeling Rules

- Model health and person data using FHIR naming and semantics first. Avoid introducing fields that do not map to a clear FHIR concept unless there is a documented product requirement.
- Include the canonical FHIR specification URL in @moduledoc for FHIR-inspired resources and datatypes.
- Use existing shared datatypes (CodeableConcept, Coding, Quantity, HumanName, Period, Annotation, ContactPoint, Age, Duration) before creating new custom maps.
- For embedded datatype resources, keep current conventions:
  - data_layer: :embedded.
  - embed_nil_values?: false.
  - GraphQL type enabled where externally exposed.
- Keep optionality compatible with clinical reality. Prefer nullable optional fields with explicit validations for invariants instead of forcing fake defaults.
- Use coded concepts with explicit system and code pairs, and centralize stable code-system constants at module level.
- For derived clinical facts (for example BMI or ratios), use explicit actions or calculations with clear provenance from source observations.
- Keep terminology references standards-based (for example LOINC, SNOMED, RxNorm, UCUM) and do not hardcode display-only free text where coded values are expected.
- When a field differs from FHIR naming due to implementation constraints, add a short rationale comment explaining why.
- Preserve anthropometry as one coherent concept across measurements (weight, height, BMI, circumferences) instead of splitting into parallel taxonomies.
- Keep status/state enums aligned with FHIR lifecycle semantics whenever possible.
- If a requirement is intentionally non-FHIR, document the extension rationale in module documentation and keep the extension isolated.
