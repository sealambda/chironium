defmodule Mix.Tasks.Chironium.Seed do
  @moduledoc "Seed an organization with all resources: practitioners, patients, care teams, and clinical data."
  @shortdoc "Seed a full organization with all resources"

  use Mix.Task

  alias Chironium.Seed.{All, Organization}
  alias Mix.Tasks.Chironium.Seed.Helpers

  @default_patients 50
  @default_practitioners 10

  @impl true
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args,
        strict: [patients: :integer, practitioners: :integer, invite: :string, role: :string],
        aliases: [p: :patients]
      )

    patient_count = Keyword.get(opts, :patients, @default_patients)
    practitioner_count = Keyword.get(opts, :practitioners, @default_practitioners)
    invite_email = Keyword.get(opts, :invite)
    role = Helpers.parse_role(opts)

    Helpers.ensure_started!()

    {user, org, tenant} = Organization.seed()
    Helpers.info("[Seed] Organization '#{org.name}' created (tenant: #{tenant}).")

    All.seed(tenant,
      patients: patient_count,
      practitioners: practitioner_count,
      log: &Helpers.info/1
    )

    invite = Organization.seed_invitation(org, user, invite_email, role)

    if invite_email do
      Helpers.info("[Seed] Invitation sent to #{invite.email} with role '#{invite.role}'.")
    else
      Helpers.info("[Seed] Invite code: #{invite.invite_code} (role: #{invite.role})")
    end

    Helpers.info("[Seed] Done. User email: #{user.email}")
  end
end
