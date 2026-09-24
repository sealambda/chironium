defmodule Chironium.BaseResources.Auditable.PaperTrailMixin do
  @moduledoc """
  Mixed into every PaperTrail version resource.

  Versions expose the full change history of their source record, so only
  staff actors may read them. Reads through `paper_trail_versions` still
  require access to the source record. Versions are written by PaperTrail
  without authorization.
  """

  def version_resource(type) do
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
