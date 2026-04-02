defmodule Chironium.Accounts.PrincipalGrantInput do
  @moduledoc """
  Input type for specifying principal grants when creating an invitation.

  Both fields are required. The referenced principal must exist within the
  invitation's organization; this is validated when the invitation is created.

  Registered in the Absinthe schema as `:principal_grant_input`.
  """

  use Ash.TypedStruct
  use AshGraphql.Type

  typed_struct do
    field :principal_type, Chironium.Accounts.PrincipalType do
      allow_nil? false
    end

    field :principal_id, :uuid do
      allow_nil? false
    end
  end

  # Used for output fields; for input arguments, AshGraphql calls graphql_input_type/1.
  @impl AshGraphql.Type
  def graphql_type(_), do: :principal_grant_input

  @impl AshGraphql.Type
  def graphql_input_type(_), do: :principal_grant_input
end
