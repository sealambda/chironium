# Notices

Chironium is copyright © 2026 Sealambda GmbH and the Chironium contributors, and is licensed under the GNU Affero General Public License, version 3.0 only. See [LICENSE](LICENSE).

This file covers third-party content that the AGPL does **not** cover: the clinical terminologies the source code refers to, and the obligations that come with them. Software dependencies fetched by `mix` and `pnpm` carry their own permissive licenses (MIT, Apache-2.0, BSD, ISC, MPL-2.0, OFL-1.1) and are listed in `mix.lock` and `pnpm-lock.yaml`.

## What is and is not in this repository

Chironium's data model follows HL7 FHIR and identifies clinical concepts with codes from standard terminologies. The repository contains:

- **A small number of code identifiers** where the application needs a fixed concept, such as the LOINC codes for body weight, height and BMI in `lib/chironium/health/observation.ex`, and the SNOMED CT parent concepts that scope terminology searches in `lib/chironium/terminology/context_mapper.ex`.
- **Sample-data catalogs** used to generate development data: about thirty SNOMED CT concepts with their descriptions and ten RxNorm drug codes in `lib/chironium/generator.ex`, and a pathology catalog with ICD-10-CM codes in `priv/repo/seeds/`.
- **Importers** in `lib/chironium/terminology/importer/` that load full LOINC and SNOMED CT releases from files you supply. No release content (tables, descriptions, relationships, reference sets) is stored in this repository or in the published Docker images.

Each organization that deploys Chironium is responsible for obtaining the terminology releases it imports under the terminology owner's license and for complying with that license. Chironium's AGPL license grants no rights in LOINC, SNOMED CT, RxNorm, ICD-10-CM or UCUM.

## SNOMED CT®

SNOMED CT is owned by the International Health Terminology Standards Development Organisation (IHTSDO), trading as SNOMED International. It is not open-source or public-domain content. Using SNOMED CT, including running Chironium with SNOMED CT content imported, requires a SNOMED CT Affiliate License. The Chironium maintainers use SNOMED CT under the SNOMED CT Affiliate License Agreement.

Required notice (SNOMED CT Affiliate License Agreement, clause 8.3.1):

> This material includes SNOMED Clinical Terms® (SNOMED CT®) which is used by permission of the International Health Terminology Standards Development Organisation (IHTSDO). All rights reserved. SNOMED CT®, was originally created by The College of American Pathologists. "SNOMED" and "SNOMED CT" are registered trademarks of the IHTSDO.

What this means for you:

- **If you deploy Chironium and import SNOMED CT**, your organization must hold its own Affiliate License. In SNOMED International Member countries (among them Switzerland, Spain, Portugal, Germany, France, Austria, the United Kingdom and the United States) the license is free of charge: register through the [Member Licensing and Distribution Service](https://mlds.ihtsdotools.org/) or your National Release Center. In non-Member countries an annual fee per deployment applies; see [SNOMED International licensing](https://www.snomed.org/licensing).
- **If you redistribute Chironium with SNOMED CT content included**, for example a Docker image or database dump with an imported release, you become a distributor of SNOMED CT. You must hold an Affiliate License, reproduce the notice above together with the version and release date of the SNOMED CT content (clause 8.3), and sub-license only end users who are themselves entitled to use SNOMED CT in their territory (clauses 2.1.5 and 9).
- **If you contribute to Chironium**, keep the embedded SNOMED CT sample concepts to a minimum and do not add SNOMED CT descriptions, relationships or reference-set content to the repository.

The Affiliate License Agreement is available from [SNOMED International](https://www.snomed.org/get-snomed) and is reproduced as Appendix 2 of the UMLS Metathesaurus License.

## LOINC®

LOINC is copyright © Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC) Committee, and is available at no cost under the [LOINC Copyright Notice and License](https://loinc.org/license). The license permits incorporating LOINC codes into software products, subject to the conditions in its Section 10.

Required notice (LOINC License, Section 10.1):

> This material contains content from LOINC (http://loinc.org). LOINC is copyright © Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC) Committee and is available at no cost under the license at http://loinc.org/license. LOINC® is a registered United States trademark of Regenstrief Institute, Inc.

Conditions that apply to Chironium and to works derived from it:

- Keep the notice above in the license or terms of use of any product or service built on Chironium, including hosted services (Section 10.1).
- Do not change LOINC codes or the contents of LOINC Table fields, and do not use LOINC to develop a competing standard for identifying observations (Sections 1 and 2).
- Wherever a LOINC code is copied into source code or documentation, keep it associated with one of its LOINC display names, such as the long common name (Section 10.3). Add the name in a comment or `display` field next to any new code constant.
- Keep the LOINC release version together with imported data (Section 9); the importer records it.
- Translating LOINC content requires Regenstrief's prior agreement (Section 12).

## RxNorm

RxNorm normalized names and codes (RXCUI) are created by the U.S. National Library of Medicine (NLM) and are in the public domain. Only the public-domain RXNORM source vocabulary is referenced; Chironium does not include or import the proprietary source vocabularies bundled in the full RxNorm release, which require a UMLS license. NLM requests this acknowledgement:

> This product uses publicly available data courtesy of the U.S. National Library of Medicine (NLM), National Institutes of Health, Department of Health and Human Services; NLM is not responsible for the product and does not endorse or recommend this or any other product.

Terms: [RxNorm Terms of Service](https://www.nlm.nih.gov/research/umls/rxnorm/docs/termsofservice.html).

## ICD-10-CM

The pathology catalog seed uses ICD-10-CM codes. ICD-10-CM is published by the U.S. National Center for Health Statistics and is in the public domain in the United States. The WHO classifications it derives from (ICD-10, ICD-11) are copyright of the World Health Organization; do not add WHO ICD content to the repository without a WHO license.

## UCUM

Units of measure use the Unified Code for Units of Measure (http://unitsofmeasure.org), copyright © 1999-2024 Regenstrief Institute, Inc., under the [UCUM Copyright Notice and License](https://ucum.org/license), version 1.1. Only UCUM unit codes are referenced; the UCUM specification is not redistributed.

## HL7® FHIR®

The data model follows HL7 FHIR. The FHIR specification is licensed under Creative Commons "No Rights Reserved" (CC0). HL7®, FHIR® and the FHIR flame design are registered trademarks of Health Level Seven International. Their use here does not constitute endorsement by HL7.
