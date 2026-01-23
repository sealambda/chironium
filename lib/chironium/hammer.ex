defmodule Chironium.Hammer do
  @moduledoc """
  Rate limiting configuration using Hammer.

  Provides ETS-based rate limiting for various application features such as
  authentication attempts, API calls, and other rate-sensitive operations.
  """
  use Hammer, backend: :ets
end
