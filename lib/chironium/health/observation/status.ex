defmodule Chironium.Health.Observation.Status do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-observation-status.html
  """

  use Ash.Type.Enum,
    values: [
      registered: [
        label: "Registered",
        description:
          "The existence of the observation is registered, but there is no result yet available."
      ],
      preliminary: [
        label: "Preliminary",
        description:
          "This is an initial or interim observation: data may be incomplete or unverified."
      ],
      final: [
        label: "Final",
        description:
          "The observation is complete and there are no further actions needed. Additional information such as 'released', 'signed', etc. would be represented using Provenance which provides not only the act but also the actors and dates and other related data. These act states would be associated with an observation status of preliminary until they are all completed and then a status of final would be applied."
      ],
      amended: [
        label: "Amended",
        description:
          "Subsequent to being Final, the observation has been modified subsequent. This includes updates/new information and corrections."
      ],
      corrected: [
        label: "Corrected",
        description:
          "Subsequent to being Final, the observation has been modified to correct an error in the test result."
      ],
      cancelled: [
        label: "Cancelled",
        description:
          "The observation is unavailable because the measurement was not started or not completed (also sometimes called 'aborted')."
      ],
      entered_in_error: [
        label: "Entered in Error",
        description:
          "The observation has been withdrawn following previous final release. This electronic record should never have existed, though it is possible that real-world decisions were based on it. (If real-world activity has occurred, the status should be 'cancelled' rather than 'entered-in-error')."
      ],
      unknown: [
        label: "Unknown",
        description:
          "The authoring/source system does not know which of the status values currently applies for this observation. Note: This concept is not to be used for 'other' - one of the listed statuses is presumed to apply, but the authoring/source system does not know which."
      ]
    ]

  def graphql_type(_), do: :observation_status
end
