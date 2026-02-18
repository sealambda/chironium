defmodule Chironium.Health.Observation do
  @moduledoc """
  https://hl7.org/fhir/R5/observation.html
  """
  require Ash.Resource.Change.Builtins
  require Ash.Query
  require Logger

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
  @unit_of_measure_code_bmi "kg/m2"
  @loinc_system "http://loinc.org"
  @loinc_code_body_weight "29463-7"
  @loinc_code_body_height "8302-2"
  @loinc_code_bmi "39156-5"

  postgres do
    table "observations"

    custom_indexes do
      index :code, using: "gin"
    end
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
      list :list_bmi_observations, :read_bmi
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

      # TODO Maybe we should move this to a external change?
      change after_action(fn changeset, observation, context ->
               opts = [tenant: context.tenant, authorize?: false]

               case Chironium.Health.Observation
                    |> Ash.Changeset.for_create(
                      :compute_bmi,
                      %{subject_id: observation.subject_id},
                      opts
                    )
                    |> Ash.create() do
                 {:ok, _} ->
                   :ok

                 {:error, reason} ->
                   Logger.warning(
                     "[Observation] BMI computation skipped after weight log: #{inspect(reason)}"
                   )
               end

               {:ok, observation}
             end)
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

      # TODO Maybe we should move this to a external change?
      change after_action(fn changeset, observation, context ->
               opts = [tenant: context.tenant, authorize?: false]

               case Chironium.Health.Observation
                    |> Ash.Changeset.for_create(
                      :compute_bmi,
                      %{subject_id: observation.subject_id},
                      opts
                    )
                    |> Ash.create() do
                 {:ok, _} ->
                   :ok

                 {:error, reason} ->
                   Logger.warning(
                     "[Observation] BMI computation skipped after height log: #{inspect(reason)}"
                   )
               end

               {:ok, observation}
             end)
    end

    create :compute_bmi do
      description "Auto-generate a BMI observation from the latest weight and height."
      accept [:subject_id]

      change set_attribute(:code, %{
               coding: [
                 %{
                   system: @loinc_system,
                   code: @loinc_code_bmi,
                   display: "Body mass index (BMI) [Ratio]"
                 }
               ]
             })

      # TODO Maybe we should move this to a external change?
      change fn changeset, context ->
        subject_id = Ash.Changeset.get_attribute(changeset, :subject_id)
        tenant = context.tenant

        weight_query =
          Chironium.Health.Observation
          |> Ash.Query.for_read(:read_body_weight)
          |> Ash.Query.filter(subject_id == ^subject_id)
          |> Ash.Query.sort(id: :desc)

        height_query =
          Chironium.Health.Observation
          |> Ash.Query.for_read(:read_body_height)
          |> Ash.Query.filter(subject_id == ^subject_id)
          |> Ash.Query.sort(id: :desc)

        with {:ok, %{results: [weight]}} <-
               Ash.read(weight_query, tenant: tenant, authorize?: false, page: [limit: 1]),
             {:ok, %{results: [height]}} <-
               Ash.read(height_query, tenant: tenant, authorize?: false, page: [limit: 1]) do
          weight_kg = weight.value_quantity.value
          height_cm = height.value_quantity.value
          height_m = Decimal.div(height_cm, Decimal.new(100))
          bmi = Decimal.div(weight_kg, Decimal.mult(height_m, height_m))

          Ash.Changeset.change_attribute(changeset, :value_quantity, %{
            system: @unit_of_measure_system,
            code: @unit_of_measure_code_bmi,
            value: Decimal.round(bmi, 1)
          })
        else
          _ ->
            Ash.Changeset.add_error(changeset,
              field: :subject_id,
              message: "No weight or height observation found for subject."
            )
        end
      end
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

    read :read_bmi do
      description "Read all BMI observations."
      pagination default_limit: 1, keyset?: true

      filter expr(
               fragment(
                 "? @> ?::jsonb",
                 code,
                 %{coding: [%{system: @loinc_system, code: @loinc_code_bmi}]}
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
      description "Type of observation (code / type)"
      public? true
    end

    attribute :effective_date_time, :datetime do
      # TODO There's support for effectivePeriod, effectiveTiming, effectiveInstant too
      #      https://hl7.org/fhir/R5/observation-definitions.html#Observation.effective_x_
      description "Clinically relevant time/time-period for observation"
      public? true
      default &DateTime.utc_now/0
    end

    # TODO Should we use a union type instead for the GraphQL schema?
    attribute :value_quantity, Chironium.Datatypes.Quantity do
      description "Actual result"
      public? true
    end

    attribute :value_codeable_concept, Chironium.Datatypes.CodeableConcept do
      description "Actual result"
      public? true
    end

    attribute :value_string, :string do
      description "Actual result"
      public? true
    end

    attribute :note, {:array, Chironium.Datatypes.Annotation} do
      description "Comments about the observation"
      public? true
    end
  end

  relationships do
    belongs_to :subject, Chironium.Health.Patient do
      # TODO The subject is the patient, but the FHIR spec says "Who and/or what the observation is about"
      description "Who the observation is about"
      allow_nil? false
      public? true
    end
  end
end
