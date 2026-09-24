defmodule Chironium.Accounts.ActorResolverTest do
  use Chironium.DataCase, async: false

  require Ash.Query

  import Chironium.Generator

  alias Chironium.Accounts.ActorResolver

  setup do
    owner = generate(user())
    organization = generate(organization(actor: owner))
    tenant = "org_#{organization.id}"

    %{owner: owner, organization: organization, tenant: tenant}
  end

  defmodule StubPatientResolver do
    @moduledoc false
    @behaviour Chironium.Accounts.PrincipalResolver

    @impl true
    def resolve(principal_id, _all_ids, _user, tenant) do
      case Ash.get(Chironium.Health.Patient, principal_id, authorize?: false, tenant: tenant) do
        {:ok, patient} -> {:ok, patient}
        _error -> :error
      end
    end
  end

  describe "resolve/3" do
    test "returns the user when no grants exist", ctx do
      user = generate(user())
      assert ActorResolver.resolve(user, ctx.tenant, principal_types: [:practitioner]) == user
    end

    test "resolves to practitioner when a single active grant exists", ctx do
      user = generate(user())
      practitioner = create_practitioner(ctx)
      create_grant(ctx, user.id, practitioner.id)

      actor = ActorResolver.resolve(user, ctx.tenant, principal_types: [:practitioner])

      assert actor.__struct__ == Chironium.Health.Practitioner
      assert actor.id == practitioner.id
    end

    test "falls through to second principal when first is archived", ctx do
      user = generate(user())
      archived_prac = create_practitioner(ctx)
      surviving_prac = create_practitioner(ctx)

      # Create grants for both. The archived one is created first so it appears
      # first in the query results (ordered by insertion time).
      create_grant(ctx, user.id, archived_prac.id)
      create_grant(ctx, user.id, surviving_prac.id)

      # Soft-delete the first practitioner.
      Ash.destroy!(archived_prac, authorize?: false, tenant: ctx.tenant)

      actor = ActorResolver.resolve(user, ctx.tenant, principal_types: [:practitioner])

      assert actor.__struct__ == Chironium.Health.Practitioner
      assert actor.id == surviving_prac.id
    end

    test "falls back to user when all principals are archived", ctx do
      user = generate(user())
      prac = create_practitioner(ctx)
      create_grant(ctx, user.id, prac.id)

      Ash.destroy!(prac, authorize?: false, tenant: ctx.tenant)

      actor = ActorResolver.resolve(user, ctx.tenant, principal_types: [:practitioner])

      # No resolvable principal — returns the original user.
      assert actor.__struct__ == Chironium.Accounts.User
      assert actor.id == user.id
    end

    test "attaches all grant IDs as metadata regardless of which resolves", ctx do
      user = generate(user())
      archived_prac = create_practitioner(ctx)
      surviving_prac = create_practitioner(ctx)

      create_grant(ctx, user.id, archived_prac.id)
      create_grant(ctx, user.id, surviving_prac.id)

      Ash.destroy!(archived_prac, authorize?: false, tenant: ctx.tenant)

      actor = ActorResolver.resolve(user, ctx.tenant, principal_types: [:practitioner])

      all_ids = Ash.Resource.get_metadata(actor, :practitioner_ids)
      assert is_list(all_ids)
      assert archived_prac.id in all_ids
      assert surviving_prac.id in all_ids
    end
  end

  describe "resolve/3 with patient and practitioner grants" do
    setup ctx do
      previous = Application.get_env(:chironium, ActorResolver)

      Application.put_env(:chironium, ActorResolver,
        principal_resolvers: %{
          practitioner: Chironium.Health.PrincipalResolver,
          patient: StubPatientResolver
        }
      )

      on_exit(fn -> Application.put_env(:chironium, ActorResolver, previous) end)

      user = generate(user())
      practitioner = create_practitioner(ctx)
      patient = create_patient(ctx)
      create_grant(ctx, user.id, practitioner.id)
      create_grant(ctx, user.id, patient.id, :patient)

      %{user: user, practitioner: practitioner, patient: patient}
    end

    test "resolves only the requested principal type", ctx do
      assert %Chironium.Health.Practitioner{id: id} =
               ActorResolver.resolve(ctx.user, ctx.tenant, principal_types: [:practitioner])

      assert id == ctx.practitioner.id

      assert %Chironium.Health.Patient{id: id} =
               ActorResolver.resolve(ctx.user, ctx.tenant, principal_types: [:patient])

      assert id == ctx.patient.id
    end

    test "prefers principal types in the order given", ctx do
      assert %Chironium.Health.Practitioner{} =
               ActorResolver.resolve(ctx.user, ctx.tenant,
                 principal_types: [:practitioner, :patient]
               )

      assert %Chironium.Health.Patient{} =
               ActorResolver.resolve(ctx.user, ctx.tenant,
                 principal_types: [:patient, :practitioner]
               )
    end

    test "requires principal types", ctx do
      assert_raise KeyError, fn -> ActorResolver.resolve(ctx.user, ctx.tenant, []) end
    end
  end

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  defp create_practitioner(ctx) do
    Chironium.Health.Practitioner
    |> Ash.Changeset.for_create(
      :create,
      %{name: [%{text: "Dr. Test"}]},
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

  defp create_grant(ctx, user_id, principal_id, principal_type \\ :practitioner) do
    Chironium.Accounts.PrincipalGrant
    |> Ash.Changeset.for_create(
      :create,
      %{
        user_id: user_id,
        principal_type: principal_type,
        principal_id: principal_id,
        active: true
      },
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end
end
