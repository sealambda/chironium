defmodule Chironium.QuestionnaireRequestFixtures do
  @moduledoc """
  Builds organizations, care teams, patients and questionnaire requests for the
  patient questionnaire link tests.
  """

  import Chironium.Generator

  require Ash.Query

  alias Chironium.Accounts.GuestAccess
  alias Chironium.Health.PatientPrincipalResolver
  alias Chironium.Health.Questionnaire
  alias Chironium.Health.Task

  @loinc "http://loinc.org"
  @ucum "http://unitsofmeasure.org"

  def organization_context do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    %{owner: owner, organization: organization, tenant: "org_#{organization.id}"}
  end

  @doc "A practitioner actor on an active care team for the patient."
  def practitioner_actor(ctx, patient) do
    user = generate(user())

    Chironium.Accounts.OrganizationUsers
    |> Ash.Changeset.for_create(
      :create,
      %{organization_id: ctx.organization.id, user_id: user.id, role: :member},
      authorize?: false
    )
    |> Ash.create!()

    practitioner = create!(ctx, Chironium.Health.Practitioner, %{name: [%{text: "Dr. Rivera"}]})

    create!(ctx, Chironium.Accounts.PrincipalGrant, %{
      user_id: user.id,
      principal_type: :practitioner,
      principal_id: practitioner.id,
      active: true
    })

    care_team =
      create!(ctx, Chironium.Health.CareTeam, %{
        status: :active,
        name: "Care team",
        subject_patient_id: patient.id
      })

    create!(ctx, Chironium.Health.CareTeamParticipant, %{
      care_team_id: care_team.id,
      practitioner_id: practitioner.id,
      active: true
    })

    Chironium.Accounts.ActorResolver.resolve(user, ctx.tenant, principal_types: [:practitioner])
  end

  @doc "A patient whose person record has the given email address, or none."
  def patient(ctx, email \\ "patient@example.com") do
    telecom = if email, do: [%{system: :email, value: email, use: :home}], else: []

    Chironium.Health.Patient
    |> Ash.Changeset.for_create(
      :create_patient_with_person,
      %{person: %{name: [%{given: ["Ana"], family: "López"}], telecom: telecom}},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  def questionnaire(ctx, status \\ :active) do
    create!(ctx, Questionnaire, %{title: "Weekly check-in", status: status, item: items()})
  end

  def items do
    [
      %{
        "linkId" => "weight",
        "type" => "quantity",
        "text" => "Body weight",
        "code" => [%{"system" => @loinc, "code" => "29463-7", "display" => "Body weight"}]
      },
      %{"linkId" => "comments", "type" => "text", "text" => "General comments"}
    ]
  end

  def answers(weight \\ 72.5) do
    [
      %{
        "linkId" => "weight",
        "answer" => [
          %{
            "valueQuantity" => %{
              "value" => weight,
              "unit" => "kg",
              "system" => @ucum,
              "code" => "kg"
            }
          }
        ]
      },
      %{"linkId" => "comments", "answer" => [%{"valueString" => "Feeling good"}]}
    ]
  end

  def request(ctx, actor, patient, questionnaire, attrs \\ %{}) do
    Task
    |> Ash.Changeset.for_create(
      :request_questionnaire,
      Map.merge(%{patient_id: patient.id, questionnaire_id: questionnaire.id}, attrs),
      actor: actor,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  def request!(ctx, actor, patient, questionnaire, attrs \\ %{}) do
    {:ok, task} = request(ctx, actor, patient, questionnaire, attrs)
    task
  end

  @doc "The accesses issued for a task, keyed by channel. Revoked ones are included."
  def accesses(task) do
    GuestAccess
    |> Ash.Query.filter(task_id == ^task.id)
    |> Ash.Query.sort(inserted_at: :desc)
    |> Ash.read!(authorize?: false)
  end

  def access(task, channel), do: Enum.find(accesses(task), &(&1.channel == channel))

  def token_from_url(url) do
    %URI{query: query} = URI.parse(url)
    query |> URI.decode_query() |> Map.fetch!("token")
  end

  @doc "Runs the magic link sign-in, as the confirm form's POST does."
  def sign_in(token) do
    strategy = AshAuthentication.Info.strategy!(GuestAccess, :magic_link)
    AshAuthentication.Strategy.action(strategy, :sign_in, %{"token" => token}, [])
  end

  @doc "Signs in with the task's link and claims it; returns the scoped patient actor."
  def open_link(task) do
    {:ok, guest_access} = task.__metadata__.link_url |> token_from_url() |> sign_in()
    {:ok, patient} = PatientPrincipalResolver.resolve_guest(guest_access)
    {:ok, claimed} = Chironium.Health.QuestionnaireRequests.claim(guest_access, patient)
    {:ok, patient} = PatientPrincipalResolver.resolve_guest(claimed)
    {claimed, patient}
  end

  def submit(ctx, patient, task, answers \\ answers()) do
    Chironium.Health.QuestionnaireResponse
    |> Ash.Changeset.for_create(
      :submit_from_portal,
      %{task_id: task.id, item: answers},
      actor: patient,
      tenant: ctx.tenant
    )
    |> Ash.create()
  end

  @doc "Moves an access's expiry, standing in for the passage of time."
  def expire!(%GuestAccess{} = guest_access, at \\ DateTime.add(DateTime.utc_now(), -1, :minute)) do
    Chironium.Repo.query!("UPDATE guest_accesses SET expires_at = $1 WHERE id = $2", [
      at,
      Ecto.UUID.dump!(guest_access.id)
    ])
  end

  def reload(ctx, %Task{} = task),
    do: Ash.get!(Task, task.id, tenant: ctx.tenant, authorize?: false)

  def reload(%GuestAccess{} = guest_access),
    do: Ash.get!(GuestAccess, guest_access.id, authorize?: false)

  defp create!(ctx, resource, attrs) do
    resource
    |> Ash.Changeset.for_create(:create, attrs, authorize?: false, tenant: ctx.tenant)
    |> Ash.create!()
  end
end
