defmodule Chironium.Automation do
  use Ash.Domain,
    otp_app: :chironium,
    extensions: [
      AshGraphql.Domain,
      AshAdmin.Domain
    ]

  admin do
    show? true

    show_resources [
      Chironium.Automation.Rule,
      Chironium.Automation.ExecutionLog
    ]
  end

  resources do
    resource Chironium.Automation.Rule
    resource Chironium.Automation.ExecutionLog
  end
end
