defmodule Chironium.Health.QuestionnaireTest do
  @moduledoc """
  Covers the Questionnaire definition, response visibility, server-authoritative answer
  normalization, and SDC observation extraction (typed routing + idempotency).
  """
  use Chironium.DataCase, async: false

  import Chironium.Generator

  require Ash.Query

  alias Chironium.Health.Observation
  alias Chironium.Health.Questionnaire
  alias Chironium.Health.QuestionnaireResponse

  @loinc "http://loinc.org"
  @ucum "http://unitsofmeasure.org"

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  # A questionnaire with a coded weight question, an uncoded free-text question, and a
  # nested group — exercises typed extraction, the no-code path, and nesting.
  defp weekly_checkin_items do
    [
      %{
        "linkId" => "anthro",
        "type" => "group",
        "text" => "Anthropometry",
        "item" => [
          %{
            "linkId" => "weight",
            "type" => "quantity",
            "text" => "Body weight",
            "code" => [%{"system" => @loinc, "code" => "29463-7", "display" => "Body weight"}]
          },
          %{"linkId" => "comments", "type" => "text", "text" => "General comments"}
        ]
      }
    ]
  end

  defp create_questionnaire(ctx, items, status \\ :active) do
    Questionnaire
    |> Ash.Changeset.for_create(:create, %{title: "Weekly check-in", status: status, item: items},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp create_response(ctx, questionnaire, patient, answers, status \\ :completed, actor \\ nil) do
    Chironium.Health.QuestionnaireResponse
    |> Ash.Changeset.for_create(
      :create,
      %{
        questionnaire_id: questionnaire.id,
        subject_id: patient.id,
        status: status,
        item: answers
      },
      authorize?: false,
      tenant: ctx.tenant,
      actor: actor
    )
    |> Ash.create!()
  end

  defp weight_answers(value) do
    [
      %{
        "linkId" => "anthro",
        "item" => [
          %{
            "linkId" => "weight",
            "answer" => [
              %{"valueQuantity" => %{"value" => value, "unit" => "kg", "system" => @ucum, "code" => "kg"}}
            ]
          },
          %{"linkId" => "comments", "answer" => [%{"valueString" => "Feeling good"}]}
        ]
      }
    ]
  end

  defp observations_from(ctx, response) do
    Observation
    |> Ash.Query.filter(derived_from_response_id == ^response.id)
    |> Ash.read!(authorize?: false, tenant: ctx.tenant)
    |> Ash.load!([:observation_type], authorize?: false, tenant: ctx.tenant)
  end

  describe "Questionnaire definition" do
    test "accepts a valid nested item tree", ctx do
      questionnaire = create_questionnaire(ctx, weekly_checkin_items())
      assert questionnaire.status == :active
      assert [%{"linkId" => "anthro"}] = questionnaire.item
    end

    test "rejects duplicate linkIds", ctx do
      items = [
        %{"linkId" => "dup", "type" => "string", "text" => "A"},
        %{"linkId" => "dup", "type" => "string", "text" => "B"}
      ]

      assert {:error, _} =
               Questionnaire
               |> Ash.Changeset.for_create(:create, %{title: "Bad", item: items},
                 authorize?: false,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end

    test "rejects enableWhen referencing an unknown question", ctx do
      items = [
        %{
          "linkId" => "q1",
          "type" => "string",
          "text" => "A",
          "enableWhen" => [%{"question" => "ghost", "operator" => "exists", "answerBoolean" => true}]
        }
      ]

      assert {:error, _} =
               Questionnaire
               |> Ash.Changeset.for_create(:create, %{title: "Bad", item: items},
                 authorize?: false,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end
  end

  describe "response normalization (server authority)" do
    test "stamps question text from the definition", ctx do
      questionnaire = create_questionnaire(ctx, weekly_checkin_items())
      patient = create_patient(ctx)

      # Submit a deliberately wrong text; the server should overwrite it.
      answers = [
        %{
          "linkId" => "anthro",
          "text" => "WRONG",
          "item" => [
            %{"linkId" => "weight", "text" => "tampered", "answer" => [%{"valueQuantity" => %{"value" => 70}}]}
          ]
        }
      ]

      response = create_response(ctx, questionnaire, patient, answers)

      [group] = response.item
      assert group["text"] == "Anthropometry"
      [weight | _] = group["item"]
      assert weight["text"] == "Body weight"
    end

    test "rejects answers for unknown linkIds", ctx do
      questionnaire = create_questionnaire(ctx, weekly_checkin_items())
      patient = create_patient(ctx)

      answers = [%{"linkId" => "ghost", "answer" => [%{"valueString" => "x"}]}]

      assert {:error, _} =
               QuestionnaireResponse
               |> Ash.Changeset.for_create(
                 :create,
                 %{questionnaire_id: questionnaire.id, subject_id: patient.id, item: answers},
                 authorize?: false,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end

    test "rejects an answer whose value type does not match the question", ctx do
      questionnaire = create_questionnaire(ctx, weekly_checkin_items())
      patient = create_patient(ctx)

      # `weight` is a quantity question; a boolean answer is invalid.
      answers = [
        %{"linkId" => "anthro", "item" => [%{"linkId" => "weight", "answer" => [%{"valueBoolean" => true}]}]}
      ]

      assert {:error, _} =
               QuestionnaireResponse
               |> Ash.Changeset.for_create(
                 :create,
                 %{questionnaire_id: questionnaire.id, subject_id: patient.id, item: answers},
                 authorize?: false,
                 tenant: ctx.tenant
               )
               |> Ash.create()
    end
  end

  describe "observation extraction" do
    test "a coded answer routes to the typed action and lands in the anthropometry read", ctx do
      questionnaire = create_questionnaire(ctx, weekly_checkin_items())
      patient = create_patient(ctx)

      response = create_response(ctx, questionnaire, patient, weight_answers(72.5))

      observations = observations_from(ctx, response)

      weight = Enum.find(observations, &(&1.observation_type == :body_weight))
      assert weight
      assert Decimal.equal?(weight.value_quantity.value, Decimal.new("72.5"))
      assert weight.value_quantity.code == "kg"

      # The uncoded free-text comment is not extracted.
      assert length(observations) == 1
    end

    test "is idempotent across re-completion", ctx do
      questionnaire = create_questionnaire(ctx, weekly_checkin_items())
      patient = create_patient(ctx)

      response = create_response(ctx, questionnaire, patient, weight_answers(72.5))

      response
      |> Ash.Changeset.for_update(:update, %{item: weight_answers(70.0), status: :completed},
        authorize?: false,
        tenant: ctx.tenant
      )
      |> Ash.update!()

      observations = observations_from(ctx, response)
      assert length(observations) == 1
      assert Decimal.equal?(hd(observations).value_quantity.value, Decimal.new("70.0"))
    end

    test "in-progress responses do not extract", ctx do
      questionnaire = create_questionnaire(ctx, weekly_checkin_items())
      patient = create_patient(ctx)

      response = create_response(ctx, questionnaire, patient, weight_answers(72.5), :in_progress)

      assert observations_from(ctx, response) == []
    end
  end

  describe "response visibility" do
    test "a care-team practitioner sees the response; an outsider does not", ctx do
      questionnaire = create_questionnaire(ctx, weekly_checkin_items())

      {actor, patient} = setup_practitioner_with_patient(ctx)
      {outsider, _other} = setup_practitioner_with_patient(ctx)

      response = create_response(ctx, questionnaire, patient, weight_answers(72.5))

      visible = QuestionnaireResponse |> Ash.read!(actor: actor, tenant: ctx.tenant)
      assert Enum.any?(visible, &(&1.id == response.id))

      hidden = QuestionnaireResponse |> Ash.read!(actor: outsider, tenant: ctx.tenant)
      refute Enum.any?(hidden, &(&1.id == response.id))
    end

    test "author defaults to the acting practitioner", ctx do
      questionnaire = create_questionnaire(ctx, weekly_checkin_items())
      {actor, patient} = setup_practitioner_with_patient(ctx)

      response = create_response(ctx, questionnaire, patient, weight_answers(72.5), :completed, actor)
      assert response.author_id == actor.id
    end
  end

  # ---------------------------------------------------------------------------
  # Helpers (mirrors patient_sub_resource_visibility_test.exs)
  # ---------------------------------------------------------------------------

  defp setup_practitioner_with_patient(ctx) do
    prac_user = generate(user())
    create_membership(ctx.organization.id, prac_user.id, :member)

    practitioner = create_practitioner(ctx)
    grant_practitioner(ctx, prac_user.id, practitioner.id)

    patient = create_patient(ctx)
    care_team = create_care_team(ctx, patient, :active)
    add_participant(ctx, care_team, practitioner)

    {Chironium.Accounts.ActorResolver.resolve(prac_user, ctx.tenant), patient}
  end

  defp create_membership(organization_id, user_id, role) do
    Chironium.Accounts.OrganizationUsers
    |> Ash.Changeset.for_create(
      :create,
      %{organization_id: organization_id, user_id: user_id, role: role},
      authorize?: false
    )
    |> Ash.create!()
  end

  defp create_practitioner(ctx) do
    Chironium.Health.Practitioner
    |> Ash.Changeset.for_create(:create, %{name: [%{text: "Dr. Test"}]},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp create_patient(ctx) do
    Chironium.Health.Patient
    |> Ash.Changeset.for_create(:create, %{}, authorize?: false, tenant: ctx.tenant)
    |> Ash.create!()
  end

  defp create_care_team(ctx, patient, status) do
    Chironium.Health.CareTeam
    |> Ash.Changeset.for_create(
      :create,
      %{status: status, name: "Test Team", subject_patient_id: patient.id},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp add_participant(ctx, care_team, practitioner) do
    Chironium.Health.CareTeamParticipant
    |> Ash.Changeset.for_create(
      :create,
      %{care_team_id: care_team.id, practitioner_id: practitioner.id, active: true},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end

  defp grant_practitioner(ctx, user_id, practitioner_id) do
    Chironium.Accounts.PrincipalGrant
    |> Ash.Changeset.for_create(
      :create,
      %{user_id: user_id, principal_type: :practitioner, principal_id: practitioner_id, active: true},
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end
end
