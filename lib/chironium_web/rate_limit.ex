defmodule ChironiumWeb.RateLimit do
  @moduledoc """
  In-memory rate limiter for unauthenticated or link-authenticated endpoints.
  """

  use Hammer, backend: :ets
end
