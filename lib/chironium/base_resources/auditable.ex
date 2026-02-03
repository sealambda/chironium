defmodule Chironium.BaseResources.Auditable do
  defmacro __using__(opts) do
    quote do
      use Ash.Resource, unquote(opts)

      postgres do
        repo Chironium.Repo
      end

      attributes do
        uuid_v7_primary_key :id

        timestamps()
      end

      paper_trail do
        belongs_to_actor :changed_by, Chironium.Accounts.User, domain: Chironium.Accounts
        ignore_attributes [:created_at, :updated_at]
        store_action_name? true
        change_tracking_mode :changes_only
        primary_key_type :uuid_v7

        # TODO I can't figure out a way to pass in :type
        # mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :graphql, ["TODO".to_atom()]}

        relationship_opts public?: true
        version_extensions extensions: [AshGraphql.Resource]
      end
    end
  end
end
