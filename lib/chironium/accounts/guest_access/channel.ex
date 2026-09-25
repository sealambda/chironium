defmodule Chironium.Accounts.GuestAccess.Channel do
  @moduledoc """
  How a guest link reaches its recipient. Each delivery gets its own access, so
  the audit trail shows which one was used.
  """

  use Ash.Type.Enum,
    values: [
      link: "Copied or shared by the practitioner",
      email: "Emailed to the recipient"
    ]
end
