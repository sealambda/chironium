defmodule Chironium.Health.ObservationDerivedTest do
  @moduledoc """
  BMI and waist/hip ratio follow their inputs on every create and update.
  """
  use Chironium.DataCase, async: false

  import Chironium.Generator

  alias Chironium.Health.Observation

  @at ~U[2026-10-23 10:00:00Z]
  @same_day ~U[2026-10-23 18:00:00Z]
  @later ~U[2026-10-24 10:00:00Z]

  setup ctx do
    owner = generate(user())
    organization = generate(organization(actor: owner, timezone: ctx[:timezone] || "Etc/UTC"))
    tenant = "org_#{organization.id}"

    patient =
      Chironium.Health.Patient
      |> Ash.Changeset.for_create(:create, %{}, authorize?: false, tenant: tenant)
      |> Ash.create!()

    %{tenant: tenant, patient: patient}
  end

  test "weight and height at the same time yield one BMI", ctx do
    log(ctx, :log_body_weight, :weight_kg, 74.0, @at)
    log(ctx, :log_body_height, :height_cm, 165.0, @at)

    assert [%{effective_date_time: @at} = bmi] = read(ctx, :read_bmi)
    assert Decimal.equal?(bmi.value_quantity.value, Decimal.new("27.2"))
  end

  test "no BMI until both inputs exist", ctx do
    log(ctx, :log_body_weight, :weight_kg, 74.0, @at)

    assert read(ctx, :read_bmi) == []
  end

  test "editing the weight updates the existing BMI", ctx do
    weight = log(ctx, :log_body_weight, :weight_kg, 74.0, @at)
    log(ctx, :log_body_height, :height_cm, 165.0, @at)

    update_observation(ctx, weight, %{value_quantity: quantity(80, "kg")})

    assert [bmi] = read(ctx, :read_bmi)
    assert Decimal.equal?(bmi.value_quantity.value, Decimal.new("29.4"))
  end

  test "moving an entry to another date moves its BMI", ctx do
    weight = log(ctx, :log_body_weight, :weight_kg, 74.0, @at)
    height = log(ctx, :log_body_height, :height_cm, 165.0, @at)

    update_observation(ctx, weight, %{effective_date_time: @later})
    update_observation(ctx, height, %{effective_date_time: @later})

    assert [%{effective_date_time: @later}] = read(ctx, :read_bmi)
  end

  test "two entries on the same day keep one BMI from the latest values", ctx do
    log(ctx, :log_body_weight, :weight_kg, 80.0, @at)
    log(ctx, :log_body_height, :height_cm, 170.0, @at)
    log(ctx, :log_body_weight, :weight_kg, 70.0, @same_day)

    assert [%{effective_date_time: @same_day} = bmi] = read(ctx, :read_bmi)
    assert Decimal.equal?(bmi.value_quantity.value, Decimal.new("24.2"))
  end

  @tag timezone: "Europe/Madrid"
  test "days follow the organization's timezone", ctx do
    log(ctx, :log_body_weight, :weight_kg, 74.0, @at)
    log(ctx, :log_body_height, :height_cm, 165.0, @at)
    # 00:30 on the 24th in Madrid, but still the 23rd in UTC: a separate day.
    log(ctx, :log_body_weight, :weight_kg, 80.0, ~U[2026-10-23 22:30:00Z])

    values =
      ctx
      |> read(:read_bmi)
      |> Enum.sort_by(& &1.effective_date_time, DateTime)
      |> Enum.map(&Decimal.to_string(&1.value_quantity.value))

    assert values == ["27.2", "29.4"]
  end

  test "a new weight reuses the latest earlier height", ctx do
    log(ctx, :log_body_height, :height_cm, 165.0, @at)
    log(ctx, :log_body_weight, :weight_kg, 74.0, @later)

    assert [%{effective_date_time: @later}] = read(ctx, :read_bmi)
  end

  test "waist and hip yield a waist/hip ratio", ctx do
    log(ctx, :log_waist_circumference, :waist_circumference_cm, 80.0, @at)
    log(ctx, :log_hip_circumference, :hip_circumference_cm, 100.0, @at)

    assert [ratio] = read(ctx, :read_waist_hip_ratio)
    assert Decimal.equal?(ratio.value_quantity.value, Decimal.new("0.8"))
  end

  defp log(ctx, action, key, value, at) do
    Observation
    |> Ash.Changeset.for_create(
      action,
      %{subject_id: ctx.patient.id, effective_date_time: at} |> Map.put(key, value),
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp update_observation(ctx, observation, attrs) do
    observation
    |> Ash.Changeset.for_update(:update, attrs, authorize?: false, tenant: ctx.tenant)
    |> Ash.update!()
  end

  defp quantity(value, unit),
    do: %{system: "http://unitsofmeasure.org", code: unit, value: value}

  defp read(ctx, action) do
    Observation
    |> Ash.Query.for_read(action)
    |> Ash.read!(authorize?: false, tenant: ctx.tenant, page: [limit: 100])
    |> Map.get(:results)
  end
end
