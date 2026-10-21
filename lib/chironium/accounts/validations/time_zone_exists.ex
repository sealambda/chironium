defmodule Chironium.Accounts.Validations.TimeZoneExists do
  @moduledoc """
  Rejects a `timezone` that the time zone database doesn't know. Asking the
  database, not a fixed list, also accepts the legacy links browsers report,
  such as `Asia/Calcutta`.
  """

  use Ash.Resource.Validation

  @impl true
  def validate(changeset, _opts, _context) do
    case Ash.Changeset.get_attribute(changeset, :timezone) do
      nil ->
        :ok

      timezone ->
        case DateTime.now(timezone) do
          {:ok, _} ->
            :ok

          {:error, _} ->
            {:error,
             field: :timezone,
             message:
               "Timezone \"#{timezone}\" is unknown. Use an IANA name such as Europe/Madrid."}
        end
    end
  end
end
