defmodule Chironium.Demo.Checks.DemoMode do
  @moduledoc "Passes when the instance runs in demo mode."

  use Ash.Policy.SimpleCheck

  @impl true
  def describe(_opts), do: "the instance runs in demo mode"

  @impl true
  def match?(_actor, _context, _opts), do: Chironium.Demo.enabled?()
end
