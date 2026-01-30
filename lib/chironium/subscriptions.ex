defmodule Chironium.Subscriptions do
  use Ash.Domain,
    otp_app: :chironium,
    extensions: [
      AshGraphql.Domain,
      AshAdmin.Domain,
      AshPaperTrail.Domain
    ]

  admin do
    show? true

    show_resources [
      Chironium.Subscriptions.Plan,
      Chironium.Subscriptions.Subscription
    ]
  end

  paper_trail do
    include_versions? true
  end

  resources do
    resource Chironium.Subscriptions.Plan
    resource Chironium.Subscriptions.Subscription
  end
end
