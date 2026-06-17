defmodule Chironium.Health.NutritionPlan do
  # TODO Base on the NutritionOrder resource: https://hl7.org/fhir/R5/nutritionorder.html

  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.Health,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [
      AshGraphql.Resource,
      AshPaperTrail.Resource,
      AshAdmin.Resource,
      AshArchival.Resource
    ]

  admin do
    show_calculations [
      :delta_kcal,
      :nutrients_kcal,
      :protein_perc,
      :protein_kcal,
      :carbs_perc,
      :carbs_kcal,
      :fat_perc,
      :fat_kcal
    ]
  end

  postgres do
    table "nutrition_plans"
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:nutrition_plan]}

    attributes_as_attributes [:target_kcal, :protein_g, :carbs_g, :fat_g]
  end

  graphql do
    type :nutrition_plan

    mutations do
      create :create_nutrition_plan, :create

      update :update_nutrition_plan, :update

      destroy :delete_nutrition_plan, :destroy
    end

    queries do
      list :list_nutrition_plans, :read
    end
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  policies do
    bypass Chironium.Accounts.Checks.PowerUser do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if {Chironium.Health.Checks.PatientSubjectVisibleToActor, relationship: :patient}
    end

    policy action([:create, :update, :destroy]) do
      authorize_if actor_present()
    end
  end

  attributes do
    # Server-side bounds: the GraphQL API is the public contract and must not
    # rely on the client's Zod schema. Caps are generous sanity limits (a target
    # of 0 is nonsensical; macros of 0 g are legitimate), not clinical guidance.
    attribute :target_kcal, :integer do
      public? true
      allow_nil? false
      constraints min: 1, max: 20_000
    end

    attribute :protein_g, :integer do
      public? true
      allow_nil? false
      constraints min: 0, max: 2_000
    end

    attribute :carbs_g, :integer do
      public? true
      allow_nil? false
      constraints min: 0, max: 2_000
    end

    attribute :fat_g, :integer do
      public? true
      allow_nil? false
      constraints min: 0, max: 2_000
    end
  end

  relationships do
    belongs_to :patient, Chironium.Health.Patient do
      public? true
      allow_nil? false
    end
  end

  calculations do
    calculate :delta_kcal, :integer, expr(nutrients_kcal - target_kcal)
    calculate :nutrients_kcal, :integer, expr(protein_kcal + carbs_kcal + fat_kcal)
    # Guard the all-zero-macros case (a persistable state) against divide-by-zero,
    # and force float division (integer/integer would truncate to 0/1 in SQL).
    calculate :protein_perc,
              :float,
              expr(if(nutrients_kcal == 0, do: 0.0, else: protein_kcal * 1.0 / nutrients_kcal))

    calculate :protein_kcal, :integer, expr(protein_g * 4)

    calculate :carbs_perc,
              :float,
              expr(if(nutrients_kcal == 0, do: 0.0, else: carbs_kcal * 1.0 / nutrients_kcal))

    calculate :carbs_kcal, :integer, expr(carbs_g * 4)

    calculate :fat_perc,
              :float,
              expr(if(nutrients_kcal == 0, do: 0.0, else: fat_kcal * 1.0 / nutrients_kcal))

    calculate :fat_kcal, :integer, expr(fat_g * 9)
  end
end
