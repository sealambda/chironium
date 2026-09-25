defmodule Chironium.BaseResources.Tenantable do
  defmacro __using__(opts) do
    quote do
      use Chironium.BaseResources.Auditable, unquote(opts)

      multitenancy do
        strategy :context
      end

      paper_trail do
        belongs_to_actor :changed_by_practitioner, Chironium.Health.Practitioner do
          domain Chironium.Health
          public? true
        end

        belongs_to_actor :changed_by_patient, Chironium.Health.Patient do
          domain Chironium.Health
          public? true
        end
      end
    end
  end
end
