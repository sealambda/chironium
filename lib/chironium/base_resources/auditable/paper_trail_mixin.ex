defmodule Chironium.BaseResources.Auditable.PaperTrailMixin do
  @moduledoc """
  Mixed into every PaperTrail version resource.

  Versions expose the full change history of their source record, so only
  staff actors may read them. Reads through `paper_trail_versions` still
  require access to the source record. Versions are written by PaperTrail
  without authorization.
  """

  def version_resource(type, readers \\ :staff)

  # For sources whose old versions may hold credentials: only the source
  # organization's admins may read them.
  def version_resource(type, :organization_admins) do
    quote do
      unquote(version_resource(type, :staff))

      policies do
        policy always() do
          authorize_if expr(version_source.actor_is_organization_admin)
        end
      end
    end
  end

  def version_resource(type, :staff) do
    quote do
      graphql do
        type "#{unquote(type)}_version" |> String.to_atom()
        derive_filter? false
        derive_sort? false
      end

      policies do
        policy always() do
          authorize_if Chironium.Accounts.Checks.StaffActor
        end
      end
    end
  end
end
