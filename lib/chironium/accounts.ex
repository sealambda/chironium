defmodule Chironium.Accounts do
  use Ash.Domain, otp_app: :chironium, extensions: [AshAdmin.Domain]

  admin do
    show? true
  end

  resources do
    resource Chironium.Accounts.Token
    resource Chironium.Accounts.User
  end
end
