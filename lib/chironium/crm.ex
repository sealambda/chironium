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
      Chironium.CRM.Person
    ]
  end

  paper_trail do
    include_versions? true
  end

  resources do
    resource Chironium.CRM.Person
  end
end
