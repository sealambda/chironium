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

  describe "resolve/2" do
    test "returns the user when no grants exist", ctx do
      user = generate(user())
      assert ActorResolver.resolve(user, ctx.tenant) == user
    end

    test "resolves to practitioner when a single active grant exists", ctx do
      user = generate(user())
      practitioner = create_practitioner(ctx)
      create_grant(ctx, user.id, practitioner.id)

      actor = ActorResolver.resolve(user, ctx.tenant)

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

      actor = ActorResolver.resolve(user, ctx.tenant)

      assert actor.__struct__ == Chironium.Health.Practitioner
      assert actor.id == surviving_prac.id
    end

    test "falls back to user when all principals are archived", ctx do
      user = generate(user())
      prac = create_practitioner(ctx)
      create_grant(ctx, user.id, prac.id)

      Ash.destroy!(prac, authorize?: false, tenant: ctx.tenant)

      actor = ActorResolver.resolve(user, ctx.tenant)

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

      actor = ActorResolver.resolve(user, ctx.tenant)

      all_ids = Ash.Resource.get_metadata(actor, :practitioner_ids)
      assert is_list(all_ids)
      assert archived_prac.id in all_ids
      assert surviving_prac.id in all_ids
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

  defp create_grant(ctx, user_id, practitioner_id) do
    Chironium.Accounts.PrincipalGrant
    |> Ash.Changeset.for_create(
      :create,
      %{
        user_id: user_id,
        principal_type: :practitioner,
        principal_id: practitioner_id,
        active: true
      },
      authorize?: false,
      tenant: ctx.tenant
    )
    |> Ash.create!()
  end
end
