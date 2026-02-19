import asyncio
import logging
import os
import re
from datetime import date, datetime, timezone

import polars as pl
from dotenv import load_dotenv

from graphql_client import (
    AllergyIntoleranceCodeInput,
    AllergyIntoleranceClinicalStatus,
    AllergyIntoleranceType,
    AllergyIntoleranceVerificationStatus,
    CodeableConceptCodingInput,
    ContactPointSystem,
    CreateAllergyIntoleranceInput,
    CreateGoalInput,
    CreateObservationInput,
    CreatePatientWithPersonInput,
    CreateSubscriptionInput,
    GoalDescriptionInput,
    GoalLifecycleStatus,
    LogBodyHeightInput,
    LogBodyWeightInput,
    ObservationCodeInput,
    ObservationNoteInput,
    ObservationStatus,
    ObservationValueQuantityInput,
    PatientCreatePatientWithPersonPersonInput,
    PersonNameInput,
    PersonTelecomInput,
)
from graphql_client.client import Client

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

EXCEL_PATH = os.getenv("FILE_PATH")
API_URL = os.getenv("API_URL") or "http://localhost:4000/gql"


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------


def parse_name(full_name: str) -> tuple[list[str], str]:
    """Split "Given1 Given2 Family" into ([given...], family)."""
    parts = full_name.strip().split()
    if len(parts) <= 1:
        return (parts, "")
    return (parts[:-1], parts[-1])


def parse_height_weight_age(raw: str | None) -> dict:
    """Extract height/weight/age from strings like '160 cm — 71 kg — 31 años'."""
    if not raw:
        return {}
    result: dict = {}

    height_m = re.search(r"(\d+[.,]?\d*)\s*cm", raw, re.IGNORECASE)
    if height_m:
        result["height_cm"] = float(height_m.group(1).replace(",", "."))

    weight_m = re.search(r"(\d+[.,]?\d*)\s*kg", raw, re.IGNORECASE)
    if weight_m:
        result["weight_kg"] = float(weight_m.group(1).replace(",", "."))

    age_m = re.search(r"(\d+)\s*años", raw, re.IGNORECASE)
    if age_m:
        result["age_years"] = int(age_m.group(1))

    return result


def parse_duration_months(raw: str | None) -> int | None:
    """Map Spanish duration strings to months (e.g. '1 año' → 12, '6 meses' → 6)."""
    if not raw:
        return None
    text = raw.strip().lower()

    year_m = re.search(r"(\d+)\s*año", text)
    if year_m:
        return int(year_m.group(1)) * 12

    month_m = re.search(r"(\d+)\s*mes", text)
    if month_m:
        return int(month_m.group(1))

    return None


def safe_str(val: object) -> str | None:
    """Return a non-empty trimmed string, or None."""
    if val is None:
        return None
    s = str(val).strip()
    return s if s and s.lower() not in ("null", "none") else None


def safe_date(val: object) -> str | None:
    """Coerce a date-like value to an ISO-8601 date string."""
    if val is None:
        return None
    if isinstance(val, date):
        return val.isoformat()
    s = str(val).strip()
    return s if s and s.lower() not in ("null", "none", "nat") else None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Row importer
# ---------------------------------------------------------------------------

# Maps spreadsheet columns to observation code labels.
OBSERVATION_COLUMNS: dict[str, str] = {
    "Enfermedades/ molestias": "clinical-note",
    "Dieta": "diet-note",
    "RECETAS INDISPENSABLES:": "essential-recipes",
    "Alimentos ✅": "diet-inclusion",
    "Alimentos ❌": "diet-exclusion",
    "Cardio semanal": "weekly-cardio",
    "Entrenamiento": "training",
    "Suplementación actual/pautada": "supplementation",
    "Otros": "other-notes",
    "Ultima regla (en caso de amenorrea)": "last-menstruation",
    "regla recuperada": "menstruation-recovered",
    "NOTAS IMPORTANTES (sop, amenorrea, inflamación...)ACTUALES": "important-notes-current",
    "NOTAS IMPORTANTES (sop, amenorrea, inflamación...)PASADAS": "important-notes-past",
}


async def import_row(
    client: Client,
    row: dict,
    plan_lookup: dict[int, str],
) -> None:
    """Import a single spreadsheet row as a patient with all related resources."""
    name_raw = safe_str(row.get("Nombre y apellido"))
    if not name_raw:
        log.warning("Skipping row with no name.")
        return

    log.info(f"Importing: {name_raw}")

    # -- Build person telecom list --
    telecom: list[PersonTelecomInput] = []
    phone = safe_str(row.get("Phone (+34)"))
    if phone:
        telecom.append(
            PersonTelecomInput(system=ContactPointSystem.PHONE, value=f"+34{phone}")
        )
    email = safe_str(row.get("Email"))
    if email:
        telecom.append(PersonTelecomInput(system=ContactPointSystem.EMAIL, value=email))
    instagram = safe_str(row.get("Instagram"))
    if instagram:
        handle = instagram.lstrip("@")
        telecom.append(
            PersonTelecomInput(
                system=ContactPointSystem.URL,
                value=f"https://instagram.com/{handle}",
            )
        )

    # -- Parse name --
    given, family = parse_name(name_raw)

    # -- 1. Create patient + person --
    patient_resp = await client.create_patient_with_person(
        input=CreatePatientWithPersonInput(
            person=PatientCreatePatientWithPersonPersonInput(
                name=[PersonNameInput(given=given, family=family)],
                telecom=telecom or None,
            )
        )
    )
    mut = patient_resp.create_patient_with_person
    if mut.errors:
        log.error(f"  Patient creation failed: {[e.message for e in mut.errors]}")
        return
    patient_id = mut.result.id
    person_id = mut.result.person_id
    log.info(f"  Patient {patient_id} / Person {person_id}")

    # -- 2. Subscription (mandatory) --
    duration_months = parse_duration_months(safe_str(row.get("DURACIÓN")))
    start_date = safe_date(row.get("FECHA INICIO"))

    if not duration_months:
        raise ValueError(f"Missing or unparseable DURACIÓN for '{name_raw}'.")
    plan_id = plan_lookup.get(duration_months)
    if not plan_id:
        raise ValueError(f"No plan matching {duration_months} months for '{name_raw}'.")

    sub = await client.create_subscription(
        input=CreateSubscriptionInput(
            subscriber_id=person_id,
            plan_id=plan_id,
            start_date=start_date,
        )
    )
    if sub.create_subscription.errors:
        raise RuntimeError(
            f"Subscription creation failed for '{name_raw}': "
            f"{[e.message for e in sub.create_subscription.errors]}"
        )
    log.info(f"  Subscription {sub.create_subscription.result.id}")

    # -- 3. Goal --
    objective = safe_str(row.get("Objetivo"))
    if objective:
        goal = await client.create_goal(
            input=CreateGoalInput(
                subject_id=patient_id,
                lifecycle_status=GoalLifecycleStatus.ACTIVE,
                description=GoalDescriptionInput(text=objective),
                start_date=start_date,
            )
        )
        if goal.create_goal.errors:
            log.error(f"  Goal failed: {[e.message for e in goal.create_goal.errors]}")
        else:
            log.info(f"  Goal {goal.create_goal.result.id}")

    # -- 4. Height, weight, age --
    measurements = parse_height_weight_age(safe_str(row.get("Altura/peso/edad")))

    if measurements.get("height_cm"):
        h = await client.log_body_height(
            input=LogBodyHeightInput(
                subject_id=patient_id, height_cm=measurements["height_cm"]
            )
        )
        if h.log_body_height.errors:
            log.error(
                f"  Height failed: {[e.message for e in h.log_body_height.errors]}"
            )
        else:
            log.info(f"  Height {measurements['height_cm']} cm")

    if measurements.get("weight_kg"):
        w = await client.log_body_weight(
            input=LogBodyWeightInput(
                subject_id=patient_id, weight_kg=measurements["weight_kg"]
            )
        )
        if w.log_body_weight.errors:
            log.error(
                f"  Weight failed: {[e.message for e in w.log_body_weight.errors]}"
            )
        else:
            log.info(f"  Weight {measurements['weight_kg']} kg")

    if measurements.get("age_years"):
        # SNOMED 424144002 = "Current chronological age".
        age = await client.create_observation(
            input=CreateObservationInput(
                subject_id=patient_id,
                status=ObservationStatus.FINAL,
                code=ObservationCodeInput(
                    coding=[
                        CodeableConceptCodingInput(
                            system="http://snomed.info/sct",
                            code="424144002",
                            display="Current chronological age",
                        )
                    ]
                ),
                value_quantity=ObservationValueQuantityInput(
                    value=str(measurements["age_years"]),
                    unit="a",
                    system="http://unitsofmeasure.org",
                    code="a",
                ),
            )
        )
        if age.create_observation.errors:
            log.error(
                f"  Age failed: {[e.message for e in age.create_observation.errors]}"
            )
        else:
            log.info(f"  Age {measurements['age_years']} years")

    # -- 5. Intolerances --
    intolerances_raw = safe_str(row.get("Intolerancias"))
    if intolerances_raw:
        ai = await client.create_allergy_intolerance(
            input=CreateAllergyIntoleranceInput(
                patient_id=patient_id,
                type_=AllergyIntoleranceType.INTOLERANCE,
                clinical_status=AllergyIntoleranceClinicalStatus.ACTIVE,
                verification_status=AllergyIntoleranceVerificationStatus.CONFIRMED,
                code=AllergyIntoleranceCodeInput(text=intolerances_raw),
            )
        )
        if ai.create_allergy_intolerance.errors:
            log.error(
                f"  Intolerance failed: {[e.message for e in ai.create_allergy_intolerance.errors]}"
            )
        else:
            log.info("  Intolerance record created")

    # -- 6. General observations --
    for col, code_text in OBSERVATION_COLUMNS.items():
        value = safe_str(row.get(col))
        if not value:
            continue

        obs = await client.create_observation(
            input=CreateObservationInput(
                subject_id=patient_id,
                status=ObservationStatus.FINAL,
                code=ObservationCodeInput(text=code_text),
                value_string=value,
                note=[
                    ObservationNoteInput(
                        text=value, author_string="Import", time=now_iso()
                    )
                ],
            )
        )
        if obs.create_observation.errors:
            log.error(
                f"  Observation '{code_text}' failed: "
                f"{[e.message for e in obs.create_observation.errors]}"
            )
        else:
            log.info(f"  Observation: {code_text}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def main():
    cookie = os.getenv("CHIRONIUM_KEY_COOKIE")
    if not cookie:
        log.error("Set CHIRONIUM_KEY_COOKIE in .env before running.")
        return
    organization_id = os.getenv("ORGANIZATION_ID")
    if not organization_id:
        log.error("Set ORGANIZATION_ID in .env before running.")
        return
    subscription_plans_6_months_id = os.getenv("SUBSCRIPTION_PLANS_6_MONTHS_ID")
    if not subscription_plans_6_months_id:
        log.error("Set SUBSCRIPTION_PLANS_6_MONTHS_ID in .env before running.")
        return
    subscription_plans_12_months_id = os.getenv("SUBSCRIPTION_PLANS_12_MONTHS_ID")
    if not subscription_plans_12_months_id:
        log.error("Set SUBSCRIPTION_PLANS_12_MONTHS_ID in .env before running.")
        return

    client = Client(
        url=API_URL,
        headers={
            "Cookie": f"_chironium_key={cookie}",
            "X-Chironium-OrganizationID": organization_id,
        },
    )

    # -- Verify authentication --
    actor = await client.current_actor()
    if not actor.current_actor:
        log.error("Not authenticated. Check your cookie value.")
        return
    log.info(f"Signed in as {actor.current_actor.email}")

    # -- Build plan duration → ID lookup --
    plan_lookup = {
        6: subscription_plans_6_months_id,
        12: subscription_plans_12_months_id,
    }

    # -- Read spreadsheet --
    df = pl.read_excel(EXCEL_PATH, read_options={"header_row": 1}).drop("__UNNAMED__0")
    log.info(f"Loaded {len(df)} rows from spreadsheet.")

    # -- Import each row --
    for row_dict in df.iter_rows(named=True):
        try:
            await import_row(client, row_dict, plan_lookup)
        except Exception:
            name = row_dict.get("Nombre y apellido", "?")
            log.exception(f"Unexpected error importing '{name}'")


if __name__ == "__main__":
    asyncio.run(main())
