defmodule Chironium.Health.Observation do
  @moduledoc """
  https://hl7.org/fhir/R5/observation.html
  """

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshAdmin.Resource]

  # TODO: Improve the code system to validate systems and related codes
  @unit_of_measure_system "http://unitsofmeasure.org"
  @unit_of_measure_code_kg "kg"
  @unit_of_measure_code_cm "cm"
  @loinc_system "http://loinc.org"
  @loinc_code_body_weight "29463-7"
  @loinc_code_body_height "8302-2"

  postgres do
    table "observations"
  end

  graphql do
    type :observation

    mutations do
      create :create_observation, :create
      create :log_body_weight, :log_body_weight
      create :log_body_height, :log_body_height
    end

    queries do
      list :list_observations, :read
      get :get_observation, :read
      list :list_body_weight_observations, :read_body_weight
      list :list_body_height_observations, :read_body_height
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:observation]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]

    create :log_body_weight do
      description """
      Log a body weight observation.

      According to https://hl7.org/fhir/R5/bodyweight.html
      """

      # TODO Should we allow a single note and automatically reference the practitioner?
      accept [:subject_id, :note]

      argument :weight_kg, :float do
        description "The weight in kilograms"
        constraints greater_than: 0
        allow_nil? false
      end

      change set_attribute(
               :code,
               %{
                 coding: [
                   %{system: @loinc_system, code: @loinc_code_body_weight, display: "Body Weight"}
                 ]
               }
             )

      change set_attribute(
               :value_quantity,
               %{
                 system: @unit_of_measure_system,
                 code: @unit_of_measure_code_kg,
                 value: arg(:weight_kg)
               }
             )

      #  TODO Should we compute and log BMI here as an additional observation?
      #       https://hl7.org/fhir/R5/bmi.html
      #       Or should we return a "dynamic" Observation resource defined by a calculation?
    end

    create :log_body_height do
      description """
      Log a body height observation.

      According to https://hl7.org/fhir/R5/bodyheight.html
      """

      # TODO Should we allow a single note and automatically reference the practitioner?
      accept [:subject_id, :note]

      argument :height_cm, :float do
        description "The height in centimeters"
        constraints greater_than: 0
        allow_nil? false
      end

      change set_attribute(
               :code,
               %{
                 coding: [
                   %{system: @loinc_system, code: @loinc_code_body_height, display: "Body Height"}
                 ]
               }
             )

      change set_attribute(
               :value_quantity,
               %{
                 system: @unit_of_measure_system,
                 code: @unit_of_measure_code_cm,
                 value: arg(:height_cm)
               }
             )
    end

    read :read_body_weight do
      description "Read all body weight observations."
      pagination default_limit: 1, keyset?: true

      filter expr(
               fragment(
                 "? @> ?::jsonb",
                 code,
                 %{coding: [%{system: @loinc_system, code: @loinc_code_body_weight}]}
               )
             )
    end

    read :read_body_height do
      description "Read all body height observations."
      pagination default_limit: 1, keyset?: true

      filter expr(
               fragment(
                 "? @> ?::jsonb",
                 code,
                 %{coding: [%{system: @loinc_system, code: @loinc_code_body_height}]}
               )
             )
    end
  end

  # TODO: Add policies
  policies do
    policy always() do
      authorize_if always()
    end
  end

  validations do
    validate attributes_present(
               [
                 :value_quantity,
                 :value_codeable_concept,
                 :value_string
               ],
               exactly: 1
             )
  end

  attributes do
    attribute :status, Chironium.Health.Observation.Status do
      allow_nil? false
      public? true
      default :registered
    end

    attribute :code, Chironium.Datatypes.CodeableConcept do
      public? true
    end

    attribute :value_quantity, Chironium.Datatypes.Quantity do
      public? true
    end

    attribute :value_codeable_concept, Chironium.Datatypes.CodeableConcept do
      public? true
    end

    attribute :value_string, :string do
      public? true
    end

    attribute :note, {:array, Chironium.Datatypes.Annotation} do
      description "Comments about the observation"
      public? true
    end
  end

  relationships do
    belongs_to :subject, Chironium.Health.Patient do
      allow_nil? false
      public? true
    end
  end
end
