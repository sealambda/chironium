defmodule Chironium.Health.ActivityDefinition.Kind do
  @moduledoc """
  All resource types that represent request resources.

  https://hl7.org/fhir/R5/valueset-request-resource-types.html
  """

  use Ash.Type.Enum,
    values: [
      appointment: [
        label: "Appointment",
        description:
          "A booking of a healthcare event among patient(s), practitioner(s), related person(s) and/or device(s) for a specific date/time."
      ],
      appointment_response: [
        label: "AppointmentResponse",
        description:
          "A reply to an appointment request for a patient and/or practitioner(s), such as a confirmation or rejection."
      ],
      care_plan: [
        label: "CarePlan",
        description:
          "Describes the intention of how one or more practitioners intend to deliver care for a particular patient, group or community for a period of time, possibly limited to care for a specific condition or set of conditions."
      ],
      claim: [
        label: "Claim",
        description:
          "A provider issued list of professional services and products which have been provided, or are to be provided, to a patient which is sent to an insurer for reimbursement."
      ],
      communication_request: [
        label: "CommunicationRequest",
        description:
          "A request to convey information; e.g. the CDS system proposes that an alert be sent to a responsible provider, the CDS system proposes that the public health agency be notified about a reportable condition."
      ],
      coverage_eligibility_request: [
        label: "CoverageEligibilityRequest",
        description:
          "The CoverageEligibilityRequest provides patient and insurance coverage information to an insurer for them to respond with information regarding whether the stated coverage is valid and in-force."
      ],
      device_request: [
        label: "DeviceRequest",
        description:
          "Represents a request a device to be provided to a specific patient."
      ],
      enrollment_request: [
        label: "EnrollmentRequest",
        description:
          "This resource provides the insurance enrollment details to the insurer regarding a specified coverage."
      ],
      immunization_recommendation: [
        label: "ImmunizationRecommendation",
        description:
          "A patient's point-in-time set of recommendations (i.e. forecasting) according to a published schedule with optional supporting justification."
      ],
      medication_request: [
        label: "MedicationRequest",
        description:
          "An order or request for both supply of the medication and the instructions for administration of the medication to a patient."
      ],
      nutrition_order: [
        label: "NutritionOrder",
        description:
          "A request to supply a diet, formula feeding (enteral) or oral nutritional supplement to a patient/resident."
      ],
      request_orchestration: [
        label: "RequestOrchestration",
        description:
          "A set of related requests that can be used to capture intended activities that have inter-dependencies such as \"give this medication after that one\"."
      ],
      service_request: [
        label: "ServiceRequest",
        description:
          "A record of a request for service such as diagnostic investigations, treatments, or operations to be performed."
      ],
      supply_request: [
        label: "SupplyRequest",
        description:
          "A record of a non-patient specific request for a medication, substance, device, certain types of biologically derived product, and nutrition product used in the healthcare setting."
      ],
      task: [
        label: "Task",
        description: "A task to be performed."
      ],
      transport: [
        label: "Transport",
        description: "Record of transport."
      ],
      vision_prescription: [
        label: "VisionPrescription",
        description:
          "An authorization for the provision of glasses and/or contact lenses to a patient."
      ]
    ]

  def graphql_type(_), do: :request_resource_type
end
