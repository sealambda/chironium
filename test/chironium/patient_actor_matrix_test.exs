defmodule Chironium.PatientActorMatrixTest do
  @moduledoc """
  Checks every action of every resource, version resources included, against a
  `%Patient{}` actor.

  Patients reach the API through the portal, so any policy a non-staff actor
  can pass is a data leak. Each action must be forbidden outright, or its
  authorization filter must be statically false, unless it is listed in
  `allowed?/2`. Reads are checked both directly and as a relationship load,
  because some checks trust any `accessing_from` context.
  """

  use Chironium.DataCase, async: false

  import Chironium.Generator

  @terminology_resources Ash.Domain.Info.resources(Chironium.Terminology)

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    patient =
      Chironium.Health.Patient
      |> Ash.Changeset.for_create(:create, %{}, authorize?: false, tenant: tenant)
      |> Ash.create!()

    scoped_patient =
      Ash.Resource.put_metadata(patient, :scope, %{task_ids: [Ash.UUIDv7.generate()]})

    %{tenant: tenant, actors: [unscoped: patient, scoped: scoped_patient]}
  end

  test "covers every domain resource, including versions" do
    assert Chironium.Health.Task in resources()
    assert Chironium.Health.Task.Version in resources()
    assert Chironium.Terminology.Concept in resources()
  end

  test "patient actors can only perform allowlisted actions", ctx do
    results =
      for resource <- resources(),
          action <- Ash.Resource.Info.actions(resource),
          access <- accesses(action),
          {actor_label, actor} <- ctx.actors do
        outcome = authorize(resource, action, access, actor, ctx.tenant)
        {resource, action.name, "#{actor_label}, #{access}", outcome}
      end

    violations =
      Enum.reject(results, fn {resource, action, _label, outcome} ->
        if allowed?(resource, action),
          do: outcome == :authorized or match?({:filtered, _}, outcome),
          else: outcome in [:forbidden, :statically_false]
      end)

    assert violations == [], """
    Patient actors got an unexpected authorization outcome.
    Allowlisted actions must be :authorized or filtered; all others :forbidden or :statically_false.

    #{Enum.map_join(violations, "\n", &format_violation/1)}
    """
  end

  # The v1 patient portal: the patient's own open requests, their questionnaires
  # and submitting answers. Their filters are proven against the database in
  # `Chironium.Health.QuestionnaireRequestTest`.
  @portal_actions [
    {Chironium.Health.Task, :read},
    {Chironium.Health.Questionnaire, :read},
    {Chironium.Health.Questionnaire, :read_including_archived},
    {Chironium.Health.QuestionnaireResponse, :submit_from_portal}
  ]

  defp allowed?(resource, action_name) do
    {resource, action_name} in @portal_actions or terminology_read?(resource, action_name)
  end

  # Terminology is shared, non-clinical reference data.
  defp terminology_read?(resource, action_name) do
    resource in @terminology_resources and
      Ash.Resource.Info.action(resource, action_name).type == :read
  end

  defp resources do
    :chironium
    |> Application.fetch_env!(:ash_domains)
    |> Enum.flat_map(&Ash.Domain.Info.resources/1)
  end

  defp accesses(%{type: :read}), do: [:direct, :relationship]
  defp accesses(_action), do: [:direct]

  defp authorize(resource, action, access, actor, tenant) do
    action
    |> bare_subject(resource)
    |> with_access(access)
    |> Ash.can(actor, tenant: tenant, run_queries?: false, alter_source?: true)
    |> classify()
  rescue
    error -> {:raised, Exception.message(error)}
  end

  # Policies only need the resource and action. Building subjects through
  # `for_*` would run action changes and preparations on empty input, and many
  # of them crash without their required arguments.
  defp bare_subject(%{type: :read} = action, resource),
    do: %{Ash.Query.new(resource) | action: action}

  defp bare_subject(%{type: :create} = action, resource),
    do: %{Ash.Changeset.new(resource) | action: action, action_type: :create}

  defp bare_subject(%{type: type} = action, resource) when type in [:update, :destroy],
    do: %{Ash.Changeset.new(struct(resource)) | action: action, action_type: type}

  defp bare_subject(%{type: :action} = action, resource),
    do: %{Ash.ActionInput.new(resource) | action: action}

  # Mimics the context Ash sets on the inner query of a relationship load.
  defp with_access(query, :relationship),
    do:
      Ash.Query.set_context(query, %{
        accessing_from: %{source: Chironium.Health.Task, name: :for_patient}
      })

  defp with_access(subject, :direct), do: subject

  defp classify({:ok, false}), do: :forbidden
  defp classify({:ok, false, _error}), do: :forbidden
  defp classify({:ok, true, %Ash.Query{} = query}), do: classify_filter(query)
  defp classify({:ok, true, %Ash.Changeset{}, %Ash.Query{} = query}), do: classify_filter(query)
  defp classify({:ok, true}), do: :authorized
  defp classify({:ok, true, _subject}), do: :authorized
  defp classify({:ok, :maybe}), do: :maybe
  defp classify(other), do: {:unexpected, other}

  defp classify_filter(%Ash.Query{filter: %Ash.Filter{expression: false}}), do: :statically_false
  defp classify_filter(%Ash.Query{filter: nil}), do: :authorized
  defp classify_filter(%Ash.Query{filter: filter}), do: {:filtered, inspect(filter)}

  defp format_violation({resource, action, label, outcome}) do
    "  #{inspect(resource)}.#{action} (#{label}): #{inspect(outcome, limit: 5, printable_limit: 200)}"
  end
end
