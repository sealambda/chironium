defmodule Chironium.CRM.Person do
  use Chironium.BaseResources.Tenantable,
    otp_app: :chironium,
    domain: Chironium.CRM,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource]

  postgres do
    table "persons"

    custom_indexes do
      index :name, using: "gin"
    end
  end

  graphql do
    type :person

    mutations do
      create :create_person, :create

      update :update_person, :update

      destroy :delete_person, :destroy
    end

    queries do
      read_one :get_person, :read
      list :list_persons, :read
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, [:person]}
  end

  actions do
    defaults [:read, :destroy, create: :*, update: :*]
  end

  # TODO: Add policies
  policies do
    policy always() do
      authorize_if always()
    end
  end

  attributes do
    attribute :name, {:array, Chironium.Datatypes.HumanName} do
      description "A name associated with the person"
      public? true
    end

    attribute :telecom, {:array, Chironium.Datatypes.ContactPoint} do
      description "A contact detail for the person (e.g. email, phone, etc.)"
      public? true
    end

    attribute :gender, Chironium.CRM.Person.AdministrativeGender do
      description "The gender of a person used for administrative purposes."
      public? true
    end

    attribute :birth_date, :date do
      description "The date on which the person was born"
      public? true
    end

    # TODO: active - should it be based on AshArchival status actually?
    # TODO: deceased, address, maritalStatus, photo, communication.language
  end

  calculations do
    calculate :given_name_sort_key,
              :string,
              expr(fragment("lower((?)[1]->'given'->>0)", name)) do
      description "Lowercased key used to sort people by given name."
      public? true
    end

    calculate :family_name_sort_key,
              :string,
              expr(fragment("lower((?)[1]->>'family')", name)) do
      description "Lowercased key used to sort people by family name."
      public? true
    end
  end
end
