defmodule Chironium.Health.CareTeam.Status do
  @moduledoc """
  Indicates the status of the care team.

  https://build.fhir.org/valueset-care-team-status.html
  """

  use Ash.Type.Enum,
    values: [
      proposed: [
        label: "Proposed",
        description:
          "	The care team has been drafted and proposed, but not yet participating in the coordination and delivery of patient care."
      ],
      active: [
        label: "Active",
        description:
          "	The care team is currently participating in the coordination and delivery of care."
      ],
      suspended: [
        label: "Suspended",
        description:
          "	The care team is temporarily on hold or suspended and not participating in the coordination and delivery of care."
      ],
      inactive: [
        label: "Inactive",
        description:
          "	The care team was, but is no longer, participating in the coordination and delivery of care."
      ],
      entered_in_error: [
        label: "Entered in Error",
        description: "The care team should have never existed."
      ]
    ]

  def graphql_type(_), do: :care_team_status
end
