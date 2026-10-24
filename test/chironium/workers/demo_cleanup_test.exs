defmodule Chironium.Workers.DemoCleanupTest do
  # Demo mode is global application env, and its policy affects every organization create.
  use ChironiumWeb.ConnCase, async: false
  use Oban.Testing, repo: Chironium.Repo

  import Chironium.DataCase, only: [enable_demo_mode: 0]
  import Chironium.Generator
  import ExUnit.CaptureLog

  alias Chironium.Accounts.ActorResolver
  alias Chironium.Accounts.Invitation
  alias Chironium.Accounts.Organization
  alias Chironium.Accounts.User
  alias Chironium.Demo
  alias Chironium.QuestionnaireRequestFixtures
  alias Chironium.Repo
  alias Chironium.Workers.DemoCleanup

  # Seeding logs a warning for each skipped BMI and waist/hip ratio.
  @moduletag :capture_log

  setup do
    stub_vite_manifest()
    enable_demo_mode()
    :ok
  end

  test "deletes a demo organization a visitor used, and every public row pointing at it" do
    conn = post(build_conn(), ~p"/demo")
    user = Ash.get!(User, user_id(conn), authorize?: false)
    [org] = Ash.read!(Organization, actor: user)
    tenant = "org_#{org.id}"

    org = Ash.update!(org, %{timezone: "Europe/Madrid"}, actor: user)

    org
    |> Ash.Changeset.for_update(
      :invite_users,
      %{invitations: [%{email: "someone@example.com", role: :member}]},
      actor: user
    )
    |> Ash.update!()

    ctx = %{tenant: tenant}

    actor =
      ActorResolver.resolve(user, tenant, principal_types: [:practitioner])

    patient =
      hd(
        Ash.read!(Chironium.Health.Patient, tenant: tenant, page: [limit: 1], authorize?: false).results
      )

    questionnaire = QuestionnaireRequestFixtures.questionnaire(ctx)
    QuestionnaireRequestFixtures.request!(ctx, actor, patient, questionnaire)

    assert count("SELECT count(*) FROM invitations WHERE organization_id = $1", [uuid(org.id)]) ==
             1

    assert count("SELECT count(*) FROM guest_accesses WHERE organization_id = $1", [uuid(org.id)]) >
             0

    age!(org, 25)
    age!(user, 25)
    assert :ok = perform_job(DemoCleanup, %{})

    refute schema_exists?(org)
    refute exists?("users", user.id)

    keys = foreign_keys()
    assert length(keys) >= 10

    for {table, column, target} <- keys do
      id = if target == "organizations", do: org.id, else: user.id
      sql = ~s|SELECT count(*) FROM #{table} WHERE "#{column}" = $1|

      assert count(sql, [uuid(id)]) == 0,
             "#{table}.#{column} still references the deleted #{target}."
    end
  end

  test "keeps a demo organization created an hour ago" do
    {user, org} = start_demo!()
    age!(org, 1)
    age!(user, 1)

    perform_job(DemoCleanup, %{})

    assert exists?("organizations", org.id)
    assert exists?("users", user.id)
  end

  test "keeps an organization with one non-demo member, whatever its age" do
    {owner, org} = start_demo!()
    member!(org, demo_user!())
    member!(org, generate(user()))
    age!(org, 24 * 365)
    age!(owner, 24 * 365)

    perform_job(DemoCleanup, %{})

    assert exists?("organizations", org.id)
    assert schema_exists?(org)
  end

  test "keeps an organization owned by a non-demo user whose members are all demo users" do
    disable_demo_mode()
    owner = generate(user())
    org = generate(organization(actor: owner))
    enable_demo_mode()
    member!(org, demo_user!())
    age!(org, 25)

    perform_job(DemoCleanup, %{})

    assert exists?("organizations", org.id)
  end

  test "keeps an organization owned by a demo user with one non-demo member" do
    {owner, org} = start_demo!()
    member!(org, generate(user()))
    age!(org, 25)
    age!(owner, 25)

    perform_job(DemoCleanup, %{})

    assert exists?("organizations", org.id)
    assert exists?("users", owner.id)
  end

  test "deletes demo users without an organization only after 24 hours" do
    fresh = demo_user!()
    age!(fresh, 0.02)
    old = demo_user!()
    age!(old, 25)

    perform_job(DemoCleanup, %{})

    assert exists?("users", fresh.id)
    refute exists?("users", old.id)
  end

  test "keeps a demo user who changed a kept organization, and deletes the rest" do
    disable_demo_mode()
    kept_org = generate(organization(actor: generate(user())))
    enable_demo_mode()

    editor = demo_user!()
    Ash.update!(kept_org, %{name: "Renamed Clinic"}, actor: editor, authorize?: false)
    age!(editor, 25)

    assert count("SELECT count(*) FROM organizations_versions WHERE changed_by_id = $1", [
             uuid(editor.id)
           ]) > 0

    other = demo_user!()
    age!(other, 25)
    {owner, due_org} = start_demo!()
    age!(due_org, 25)
    age!(owner, 25)

    log = capture_log(fn -> assert :ok = perform_job(DemoCleanup, %{}) end)

    assert log =~
             "[DemoCleanup] Kept user #{editor.id}: still referenced by organizations_versions_changed_by_id_fkey."

    assert exists?("users", editor.id)
    refute exists?("users", other.id)
    refute exists?("organizations", due_org.id)
    refute exists?("users", owner.id)
  end

  describe "a demo user who joined another demo by invite code" do
    setup do
      {owner_a, org_a} = start_demo!()
      {user_b, org_b} = start_demo!()

      org_a
      |> Ash.Changeset.for_update(
        :invite_users,
        %{invitations: [%{email: "someone@example.com", role: :member}]},
        actor: owner_a
      )
      |> Ash.update!()

      [invitation] = Ash.read!(Invitation, authorize?: false)

      Invitation
      |> Ash.ActionInput.for_action(
        :accept_by_invite_code,
        %{invite_code: invitation.invite_code},
        actor: user_b
      )
      |> Ash.run_action!()

      ids = Enum.map(Ash.read!(Organization, actor: user_b), & &1.id)
      assert Enum.sort(ids) == Enum.sort([org_a.id, org_b.id])

      %{owner_a: owner_a, org_a: org_a, user_b: user_b, org_b: org_b}
    end

    test "deleting the joined organization keeps the member and their own demo", ctx do
      age!(ctx.org_a, 25)
      age!(ctx.owner_a, 25)

      perform_job(DemoCleanup, %{})

      refute exists?("organizations", ctx.org_a.id)
      refute exists?("users", ctx.owner_a.id)
      assert exists?("users", ctx.user_b.id)
      assert exists?("organizations", ctx.org_b.id)
    end

    test "deleting the member's own organization keeps them while they belong to the other",
         ctx do
      age!(ctx.org_b, 25)
      age!(ctx.user_b, 25)

      perform_job(DemoCleanup, %{})

      refute exists?("organizations", ctx.org_b.id)
      assert exists?("users", ctx.user_b.id)
      assert exists?("organizations", ctx.org_a.id)
    end
  end

  test "matches the demo email domain case-insensitively" do
    disable_demo_mode()
    owner = demo_user!("Owner-X@DEMO.Invalid")
    org = generate(organization(actor: owner))
    enable_demo_mode()
    member = demo_user!("Member-X@Demo.INVALID")
    member!(org, member)
    # Ash lowercases on write, so only raw SQL can store a mixed-case address.
    Repo.query!("UPDATE users SET email = upper(email::text) WHERE id = ANY($1)", [
      [uuid(owner.id), uuid(member.id)]
    ])

    age!(org, 25)
    age!(owner, 25)
    age!(member, 25)

    perform_job(DemoCleanup, %{})

    refute exists?("organizations", org.id)
    refute exists?("users", owner.id)
    refute exists?("users", member.id)
  end

  test "keeps a demo user who is a member of a kept organization but owns none" do
    {owner, org} = start_demo!()
    member = demo_user!()
    member!(org, member)
    age!(member, 25)

    log = capture_log(fn -> perform_job(DemoCleanup, %{}) end)

    # The foreign key would also save the user, but the query must not select it.
    refute log =~ "Kept user"
    assert exists?("users", member.id)
    assert exists?("organizations", org.id)
    assert exists?("users", owner.id)
  end

  test "keeps a demo user who owns an organization without being its member" do
    {owner, org} = start_demo!()
    Repo.query!("DELETE FROM organization_users WHERE organization_id = $1", [uuid(org.id)])
    age!(owner, 25)

    log = capture_log(fn -> perform_job(DemoCleanup, %{}) end)

    refute log =~ "Kept user"
    assert exists?("users", owner.id)
    assert exists?("organizations", org.id)
  end

  test "cancels and deletes nothing when demo mode is off" do
    {user, org} = start_demo!()
    age!(org, 25)
    age!(user, 25)
    disable_demo_mode()

    assert {:cancel, "Demo mode is off."} = perform_job(DemoCleanup, %{})
    assert exists?("organizations", org.id)
    assert exists?("users", user.id)
  end

  test "a visitor whose demo was deleted is signed out and can start a new one" do
    put_seed(fn _tenant, _opts -> :ok end)
    conn = post(build_conn(), ~p"/demo")
    user = Ash.get!(User, user_id(conn), authorize?: false)
    [org] = Ash.read!(Organization, actor: user)
    age!(org, 25)
    age!(user, 25)

    perform_job(DemoCleanup, %{})

    assert conn |> recycle() |> get(~p"/app") |> redirected_to() == ~p"/sign-in"

    restarted = conn |> recycle() |> post(~p"/demo")
    assert redirected_to(restarted) == ~p"/app"
    assert user_id(restarted) != user.id
    assert exists?("users", user_id(restarted))
  end

  defp start_demo! do
    put_seed(fn _tenant, _opts -> :ok end)
    {:ok, user} = Demo.start()
    [org] = Ash.read!(Organization, actor: user)
    {user, org}
  end

  defp put_seed(seed) do
    previous = Application.get_env(:chironium, Demo, [])
    Application.put_env(:chironium, Demo, Keyword.put(previous, :seed, seed))
    on_exit(fn -> Application.put_env(:chironium, Demo, previous) end)
  end

  defp disable_demo_mode, do: Application.put_env(:chironium, :demo_mode?, false)

  defp demo_user! do
    token = Base.encode32(:crypto.strong_rand_bytes(10), case: :lower, padding: false)
    demo_user!("demo-#{token}@demo.invalid")
  end

  defp demo_user!(email), do: Ash.Seed.seed!(%User{email: email})

  defp member!(org, user) do
    Chironium.Accounts.OrganizationUsers
    |> Ash.Changeset.for_create(
      :create,
      %{organization_id: org.id, user_id: user.id, role: :member},
      authorize?: false
    )
    |> Ash.create!()
  end

  # Moves a record's creation back, standing in for the passage of time.
  defp age!(%Organization{id: id}, hours), do: age!("organizations", id, hours)
  defp age!(%User{id: id}, hours), do: age!("users", id, hours)

  defp age!(table, id, hours) do
    Repo.query!(
      "UPDATE #{table} SET inserted_at = inserted_at - make_interval(secs => $2) WHERE id = $1",
      [Ecto.UUID.dump!(id), hours * 3600.0]
    )
  end

  defp exists?(table, id),
    do: count("SELECT count(*) FROM #{table} WHERE id = $1", [uuid(id)]) == 1

  defp uuid(id), do: Ecto.UUID.dump!(id)

  defp schema_exists?(org) do
    count("SELECT count(*) FROM information_schema.schemata WHERE schema_name = $1", [
      "org_#{org.id}"
    ]) == 1
  end

  # Every single-column foreign key in `public` whose target is `organizations` or `users`.
  defp foreign_keys do
    keys =
      Repo.query!("""
      SELECT c.conrelid::regclass::text, a.attname, c.confrelid::regclass::text
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
      WHERE c.contype = 'f'
        AND c.connamespace = 'public'::regnamespace
        AND c.confrelid IN ('public.organizations'::regclass, 'public.users'::regclass)
      """)

    Enum.map(keys.rows, &List.to_tuple/1)
  end

  defp count(sql, params), do: Repo.query!(sql, params).rows |> hd() |> hd()

  defp user_id(conn) do
    {:ok, %{"sub" => "user?id=" <> id}} =
      conn |> get_session("user_token") |> AshAuthentication.Jwt.peek()

    id
  end
end
