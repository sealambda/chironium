defmodule Chironium.BaseResources.Auditable do
  defmacro __using__(opts) do
    quote do
      use Chironium.BaseResources.Identifiable, unquote(opts)

      attributes do
        timestamps()
      end

      paper_trail do
        belongs_to_actor :changed_by, Chironium.Accounts.User do
          domain Chironium.Accounts
          public? true
        end

        ignore_attributes [:created_at, :updated_at]
        # Versions are readable by any staff actor, so credentials such as invite
        # codes (marked `sensitive?`) stay out of them.
        sensitive_attributes :ignore
        store_action_name? true
        change_tracking_mode :changes_only
        primary_key_type :uuid_v7

        # TODO I can't figure out a way to pass in :type
        # mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :version_resource, ["TODO".to_atom()]}

        relationship_opts public?: true
        public_timestamps? true
        version_extensions extensions: [AshGraphql.Resource], authorizers: [Ash.Policy.Authorizer]
      end
    end
  end
end
