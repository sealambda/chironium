defmodule Mix.Tasks.Chironium.SeedTest do
  use Chironium.DataCase, async: true

  import ExUnit.CaptureIO

  alias Chironium.Accounts.{Invitation, Organization}
  alias Chironium.Health.{Patient, Practitioner}

  # Seeding logs a warning for each skipped BMI and waist/hip ratio.
  @moduletag :capture_log

  test "mix chironium.seed creates an organization, its data and an invitation" do
    output =
      capture_io(fn -> Mix.Tasks.Chironium.Seed.run(~w(--patients 2 --practitioners 1)) end)

    assert output =~ "[Seed] Clinical data created."
    assert_seeded()
  end

  test "Release.seed/1 creates an organization, its data and an invitation" do
    output = capture_io(fn -> Chironium.Release.seed(patients: 2, practitioners: 1) end)

    assert output =~ "[Seed] Clinical data created."
    assert_seeded()
  end

  defp assert_seeded do
    [org] = Ash.read!(Organization, authorize?: false)
    tenant = "org_#{org.id}"

    assert Ash.count!(Patient, tenant: tenant, authorize?: false) == 2
    assert Ash.count!(Practitioner, tenant: tenant, authorize?: false) == 1
    assert [%{organization_id: org_id}] = Ash.read!(Invitation, authorize?: false)
    assert org_id == org.id
  end
end
