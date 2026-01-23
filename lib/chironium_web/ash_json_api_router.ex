defmodule ChironiumWeb.AshJsonApiRouter do
  @moduledoc """
  JSON:API router for Chironium.

  Exposes Ash resources as JSON:API endpoints with OpenAPI documentation.
  """
  use AshJsonApi.Router,
    domains: [],
    open_api: "/open_api"
end
