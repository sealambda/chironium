defmodule Chironium.BaseResources.Tenantable do
  defmacro __using__(opts) do
    quote do
      use Chironium.BaseResources.Auditable, unquote(opts)

      multitenancy do
        strategy :context
      end
    end
  end
end
