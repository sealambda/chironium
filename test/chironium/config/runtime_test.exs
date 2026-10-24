defmodule Chironium.Config.RuntimeTest do
  # Changes OS environment variables, which every test shares.
  use ExUnit.Case, async: false

  @vars ~w(DEMO_MODE SECRET_KEY_BASE TOKEN_SIGNING_SECRET DATABASE_URL DATABASE_NAME
           DATABASE_USERNAME RESEND_API_KEY GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
           GOOGLE_REDIRECT_URI OIDC_ISSUER OIDC_CLIENT_ID OIDC_CLIENT_SECRET OIDC_DISPLAY_NAME
           POSTHOG_API_KEY)

  setup do
    saved = Map.new(@vars, &{&1, System.get_env(&1)})
    # The test environment's dotenv files may have set some of these.
    Enum.each(@vars, &System.delete_env/1)
    System.put_env("SECRET_KEY_BASE", String.duplicate("a", 64))
    System.put_env("TOKEN_SIGNING_SECRET", "test-token-signing-secret")

    on_exit(fn ->
      Enum.each(saved, fn
        {name, nil} -> System.delete_env(name)
        {name, value} -> System.put_env(name, value)
      end)
    end)

    # Production config reads the Vite manifest, which `mix test` may run without.
    manifest = Application.app_dir(:chironium, "priv/static/.vite/manifest.json")

    unless File.exists?(manifest) do
      File.mkdir_p!(Path.dirname(manifest))
      File.write!(manifest, "{}")
      on_exit(fn -> File.rm(manifest) end)
    end

    :ok
  end

  defp read_prod_config, do: Config.Reader.read!("config/runtime.exs", env: :prod)

  describe "sign-in methods" do
    test "production refuses to boot without one" do
      assert_raise RuntimeError, ~r/No sign-in method is configured/, &read_prod_config/0
    end

    test "demo mode counts as one" do
      System.put_env("DEMO_MODE", "true")

      assert read_prod_config()[:chironium][:demo_mode?] == true
    end

    test "DEMO_MODE=1 turns demo mode on, and other values leave it off" do
      System.put_env("DEMO_MODE", "1")
      assert read_prod_config()[:chironium][:demo_mode?] == true

      System.put_env("DEMO_MODE", "yes")
      assert_raise RuntimeError, ~r/No sign-in method is configured/, &read_prod_config/0
    end
  end

  describe "demo mode refuses third-party settings" do
    for vars <- [
          ~w(RESEND_API_KEY),
          ~w(GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET),
          ~w(OIDC_ISSUER OIDC_CLIENT_ID OIDC_CLIENT_SECRET),
          ~w(POSTHOG_API_KEY)
        ] do
      test "with #{Enum.join(vars, ", ")}" do
        System.put_env("DEMO_MODE", "true")
        Enum.each(unquote(vars), &System.put_env(&1, "set"))

        error = assert_raise RuntimeError, &read_prod_config/0

        assert error.message =~ "DEMO_MODE is set"
        assert error.message =~ "A demo never sends email or data to third parties."
        for var <- unquote(vars), do: assert(error.message =~ var)
      end
    end
  end

  describe "demo cleanup schedule" do
    # runtime.exs sets only Oban's plugins; queues and repo come from config.exs.
    defp crontab do
      config =
        Config.Reader.merge([chironium: Application.get_all_env(:chironium)], read_prod_config())

      oban = AshOban.config(config[:chironium][:ash_domains], config[:chironium][Oban])
      {Oban.Plugins.Cron, cron} = List.keyfind(oban[:plugins], Oban.Plugins.Cron, 0)
      Enum.map(cron[:crontab], &elem(&1, 1))
    end

    test "runs hourly in demo mode, next to AshOban's schedulers" do
      System.put_env("DEMO_MODE", "true")

      config = read_prod_config()[:chironium][Oban]
      assert [{Oban.Plugins.Cron, crontab: [{"0 * * * *", _}]}] = config[:plugins]

      workers = crontab()
      assert Chironium.Workers.DemoCleanup in workers
      assert Chironium.Health.Task.AshOban.SendReminder.Scheduler in workers
    end

    test "is not scheduled otherwise" do
      System.put_env("RESEND_API_KEY", "set")

      workers = crontab()
      refute Chironium.Workers.DemoCleanup in workers
      assert Chironium.Health.Task.AshOban.SendReminder.Scheduler in workers
    end
  end

  describe "database over the Unix socket" do
    setup do
      System.put_env("DEMO_MODE", "true")
      :ok
    end

    test "uses DATABASE_NAME and DATABASE_USERNAME when set" do
      System.put_env("DATABASE_NAME", "chironium_demo")
      System.put_env("DATABASE_USERNAME", "demo")

      repo = read_prod_config()[:chironium][Chironium.Repo]

      assert repo[:database] == "chironium_demo"
      assert repo[:username] == "demo"
      assert repo[:socket_dir] == "/var/run/postgresql"
    end

    test "defaults both to chironium" do
      repo = read_prod_config()[:chironium][Chironium.Repo]

      assert repo[:database] == "chironium"
      assert repo[:username] == "chironium"
    end
  end
end
