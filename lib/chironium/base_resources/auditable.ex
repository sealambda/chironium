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
        # TODO Mixin to expose via GraphQL: https://hexdocs.pm/ash_paper_trail/getting-started-with-ash-paper-trail.html#enriching-the-versions-resource

        belongs_to_actor :changed_by, Chironium.Accounts.User, domain: Chironium.Accounts
        ignore_attributes [:created_at, :updated_at]
        store_action_name? true
        change_tracking_mode :changes_only
        primary_key_type :uuid_v7
      end
    end
  end
end
