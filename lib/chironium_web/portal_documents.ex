defmodule ChironiumWeb.PortalDocuments do
  @moduledoc """
  The persisted GraphQL documents the patient portal may run, and nothing else.

  `/portal/gql` uses only this provider, never `Absinthe.Plug.DocumentProvider.Default`,
  so a patient session cannot send arbitrary queries. The manifest is generated
  from `assets/src/portal/api/portal-documents.ts` by `pnpm gql:persisted`, and
  its documents are validated against the schema when this module compiles.
  """

  use Absinthe.Plug.DocumentProvider.Compiled

  @manifest Path.expand("../../priv/graphql/portal-documents.json", __DIR__)
  @external_resource @manifest

  provide(@manifest |> File.read!() |> Jason.decode!())

  @doc "The manifest path, for tests and tooling."
  def manifest_path, do: @manifest
end
