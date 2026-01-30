defmodule Chironium.CRM do
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
      Chironium.CRM.Contact,
      Chironium.CRM.ContactPoint
    ]
  end

  paper_trail do
    include_versions? true
  end

  resources do
    resource Chironium.CRM.Contact
    resource Chironium.CRM.ContactPoint
  end
end
