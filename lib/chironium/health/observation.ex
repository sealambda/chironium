defmodule Chironium.Health.Observation do
  @moduledoc """
  Measurements and simple assertions made about a patient, device or other subject.

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
  @unit_of_measure_code_ratio "1"

  @loinc_system "http://loinc.org"
  @loinc_code_body_weight "29463-7"
  @loinc_code_body_height "8302-2"
  @loinc_code_bmi "39156-5"

  @loinc_code_chest_circumference "8279-2"

  # According to LOINC hip is "Circumference.at maximal protrusion of gluteus muscles Pelvis"
  @loinc_code_hip_circumference "56063-1"

  @loinc_code_waist_circumference "8280-0"

  @loinc_code_arm_right_circumference "56072-2"
  @loinc_code_thigh_right_circumference "8286-7"

  # @loinc_code_thigh_left_circumference "8285-9" - not sure why left is available for thigh but not for arm... just for reference

  @snomed_system "http://snomed.info/sct"
  @snomed_waist_hip_ratio "248367009"

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
      create :log_chest_circumference, :log_chest_circumference
      create :log_hip_circumference, :log_hip_circumference
      create :log_waist_circumference, :log_waist_circumference
      create :log_arm_circumference, :log_arm_circumference
      create :log_thigh_circumference, :log_thigh_circumference
    end

    queries do
      list :list_observations, :read
      get :get_observation, :read

      list :list_body_weight_observations, :read_body_weight
      list :list_body_height_observations, :read_body_height
      list :list_bmi_observations, :read_bmi
      list :list_waist_hip_ratio_observations, :read_waist_hip_ratio
      list :list_chest_circumference_observations, :read_chest_circumference
      list :list_hip_circumference_observations, :read_hip_circumference
      list :list_waist_circumference_observations, :read_waist_circumference
      list :list_arm_circumference_observations, :read_arm_circumference
      list :list_thigh_circumference_observations, :read_thigh_circumference
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:observation]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]

    ### Body Weight
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

    ### Body Height
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

    ### BMI
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

    ### Waist/hip ratio
    create :compute_waist_hip_ratio do
      description "Auto-generate a waist/hip ratio observation from the latest waist and hip circumference."
      accept [:subject_id]

      change set_attribute(:code, %{
               coding: [
                 %{
                   system: @snomed_system,
                   code: @snomed_waist_hip_ratio,
                   display: "Waist/hip ratio"
                 }
               ]
             })

      change fn changeset, context ->
        subject_id = Ash.Changeset.get_attribute(changeset, :subject_id)
        tenant = context.tenant

        waist_query =
          Chironium.Health.Observation
          |> Ash.Query.for_read(:read_waist_circumference)
          |> Ash.Query.filter(subject_id == ^subject_id)
          |> Ash.Query.sort(id: :desc)

        hip_query =
          Chironium.Health.Observation
          |> Ash.Query.for_read(:read_hip_circumference)
          |> Ash.Query.filter(subject_id == ^subject_id)
          |> Ash.Query.sort(id: :desc)

        with {:ok, %{results: [waist]}} <-
               Ash.read(waist_query, tenant: tenant, authorize?: false, page: [limit: 1]),
             {:ok, %{results: [hip]}} <-
               Ash.read(hip_query, tenant: tenant, authorize?: false, page: [limit: 1]) do
          waist_cm = waist.value_quantity.value
          hip_cm = hip.value_quantity.value
          ratio = Decimal.div(waist_cm, hip_cm)

          Ash.Changeset.change_attribute(changeset, :value_quantity, %{
            system: @unit_of_measure_system,
            code: @unit_of_measure_code_ratio,
            value: Decimal.round(ratio, 2)
          })
        else
          _ ->
            Ash.Changeset.add_error(changeset,
              field: :subject_id,
              message: "No waist or hip circumference observation found for subject."
            )
        end
      end
    end

    read :read_waist_hip_ratio do
      description "Read all waist/hip ratio observations."
      pagination default_limit: 1, keyset?: true

      filter expr(
               fragment(
                 "? @> ?::jsonb",
                 code,
                 %{coding: [%{system: @snomed_system, code: @snomed_waist_hip_ratio}]}
               )
             )
    end

    ### Chest Circumference
    create :log_chest_circumference do
      description "Log a chest circumference observation."
      accept [:subject_id, :note]

      argument :chest_circumference_cm, :float do
        description "The chest circumference in centimeters"
        constraints greater_than: 0
        allow_nil? false
      end

      change set_attribute(:code, %{
               coding: [
                 %{
                   system: @loinc_system,
                   code: @loinc_code_chest_circumference,
                   display: "Chest Circumference at nipple line"
                 }
               ]
             })

      change set_attribute(:value_quantity, %{
               system: @unit_of_measure_system,
               code: @unit_of_measure_code_cm,
               value: arg(:chest_circumference_cm)
             })
    end

    read :read_chest_circumference do
      description "Read all chest circumference observations."
      pagination default_limit: 1, keyset?: true

      filter expr(
               fragment(
                 "? @> ?::jsonb",
                 code,
                 %{coding: [%{system: @loinc_system, code: @loinc_code_chest_circumference}]}
               )
             )
    end

    ### Hip Circumference
    create :log_hip_circumference do
      description "Log a hip circumference observation."
      accept [:subject_id, :note]

      argument :hip_circumference_cm, :float do
        description "The hip circumference in centimeters"
        constraints greater_than: 0
        allow_nil? false
      end

      change set_attribute(:code, %{
               coding: [
                 %{
                   system: @loinc_system,
                   code: @loinc_code_hip_circumference,
                   display: "Circumference.at maximal protrusion of gluteus muscles Pelvis"
                 }
               ]
             })

      change set_attribute(:value_quantity, %{
               system: @unit_of_measure_system,
               code: @unit_of_measure_code_cm,
               value: arg(:hip_circumference_cm)
             })

      change after_action(fn changeset, observation, context ->
               opts = [tenant: context.tenant, authorize?: false]

               case Chironium.Health.Observation
                    |> Ash.Changeset.for_create(
                      :compute_waist_hip_ratio,
                      %{subject_id: observation.subject_id},
                      opts
                    )
                    |> Ash.create() do
                 {:ok, _} ->
                   :ok

                 {:error, reason} ->
                   Logger.warning(
                     "[Observation] Waist/hip ratio computation skipped after hip log: #{inspect(reason)}"
                   )
               end

               {:ok, observation}
             end)
    end

    read :read_hip_circumference do
      description "Read all hip circumference observations."
      pagination default_limit: 1, keyset?: true

      filter expr(
               fragment(
                 "? @> ?::jsonb",
                 code,
                 %{coding: [%{system: @loinc_system, code: @loinc_code_hip_circumference}]}
               )
             )
    end

    ### Waist Circumference
    create :log_waist_circumference do
      description "Log a waist circumference observation."
      accept [:subject_id, :note]

      argument :waist_circumference_cm, :float do
        description "The waist circumference in centimeters"
        constraints greater_than: 0
        allow_nil? false
      end

      change set_attribute(:code, %{
               coding: [
                 %{
                   system: @loinc_system,
                   code: @loinc_code_waist_circumference,
                   display: "Waist Circumference"
                 }
               ]
             })

      change set_attribute(:value_quantity, %{
               system: @unit_of_measure_system,
               code: @unit_of_measure_code_cm,
               value: arg(:waist_circumference_cm)
             })

      change after_action(fn changeset, observation, context ->
               opts = [tenant: context.tenant, authorize?: false]

               case Chironium.Health.Observation
                    |> Ash.Changeset.for_create(
                      :compute_waist_hip_ratio,
                      %{subject_id: observation.subject_id},
                      opts
                    )
                    |> Ash.create() do
                 {:ok, _} ->
                   :ok

                 {:error, reason} ->
                   Logger.warning(
                     "[Observation] Waist/hip ratio computation skipped after waist log: #{inspect(reason)}"
                   )
               end

               {:ok, observation}
             end)
    end

    read :read_waist_circumference do
      description "Read all waist circumference observations."
      pagination default_limit: 1, keyset?: true

      filter expr(
               fragment(
                 "? @> ?::jsonb",
                 code,
                 %{coding: [%{system: @loinc_system, code: @loinc_code_waist_circumference}]}
               )
             )
    end

    ### Arm Circumference
    create :log_arm_circumference do
      description "Log a arm circumference observation."
      accept [:subject_id, :note]

      argument :arm_circumference_cm, :float do
        description "The arm circumference in centimeters"
        constraints greater_than: 0
        allow_nil? false
      end

      change set_attribute(:code, %{
               coding: [
                 %{
                   system: @loinc_system,
                   code: @loinc_code_arm_right_circumference,
                   display: "Circumference Mid upper arm - right"
                 }
               ]
             })
    end

    read :read_arm_circumference do
      description "Read all arm circumference observations."
      pagination default_limit: 1, keyset?: true

      filter expr(
               fragment(
                 "? @> ?::jsonb",
                 code,
                 %{coding: [%{system: @loinc_system, code: @loinc_code_arm_right_circumference}]}
               )
             )
    end

    ### Thigh Circumference
    create :log_thigh_circumference do
      description "Log a thigh circumference observation."
      accept [:subject_id, :note]

      argument :thigh_circumference_cm, :float do
        description "The thigh circumference in centimeters"
        constraints greater_than: 0
        allow_nil? false
      end

      change set_attribute(:code, %{
               coding: [
                 %{
                   system: @loinc_system,
                   code: @loinc_code_thigh_right_circumference,
                   display: "Thigh - right Maximum circumference"
                 }
               ]
             })

      change set_attribute(:value_quantity, %{
               system: @unit_of_measure_system,
               code: @unit_of_measure_code_cm,
               value: arg(:thigh_circumference_cm)
             })
    end

    read :read_thigh_circumference do
      description "Read all thigh circumference observations."
      pagination default_limit: 1, keyset?: true

      filter expr(
               fragment(
                 "? @> ?::jsonb",
                 code,
                 %{
                   coding: [%{system: @loinc_system, code: @loinc_code_thigh_right_circumference}]
                 }
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
