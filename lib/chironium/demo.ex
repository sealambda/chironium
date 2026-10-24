defmodule Chironium.Demo do
  @moduledoc """
  Public demo mode, turned on with `DEMO_MODE=true`. See docs/public-demo.md.
  """

  @doc "Whether this instance runs as a public demo."
  @spec enabled?() :: boolean()
  def enabled?, do: Application.get_env(:chironium, :demo_mode?, false)
end
