defmodule Chironium.Health.MedicationRequest.Status do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-medicationrequest-status.html
  """

  use Ash.Type.Enum,
    values: [
      active: [
        label: "Active",
        description:
          "The prescription is 'actionable', but not all actions that are implied by it have occurred yet."
      ],
      on_hold: [
        label: "On Hold",
        description:
          "Actions implied by the prescription are to be temporarily halted, but are expected to continue later. May also be called 'suspended'."
      ],
      ended: [
        label: "Ended",
        description:
          "The prescription is no longer active because the medication is no longer needed or appropriate."
      ],
      stopped: [
        label: "Stopped",
        description: "Actions implied by the prescription are to be permanently halted, before all of them occurred."
      ],
      completed: [
        label: "Completed",
        description: "All actions that are implied by the prescription have occurred."
      ],
      cancelled: [
        label: "Cancelled",
        description:
          "The prescription has been withdrawn before any administrations have occurred."
      ],
      entered_in_error: [
        label: "Entered in Error",
        description:
          "Some of the actions that are implied by the prescription may have occurred. For example, the medication may have been dispensed and the patient may have taken some of it. Clinical decision support systems should take this status into account."
      ],
      draft: [
        label: "Draft",
        description:
          "The prescription is not yet 'actionable', e.g. it is a work in progress, requires sign-off, verification or needs to be run through decision support process."
      ],
      unknown: [
        label: "Unknown",
        description:
          "The authoring/source system does not know which of the status values currently applies for this request. Note: This concept is not to be used for 'other' - one of the listed statuses is presumed to apply, but the authoring/source system does not know which."
      ]
    ]

  def graphql_type(_), do: :medication_request_status
end
