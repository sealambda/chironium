defmodule Chironium.DataCase do
  @moduledoc """
  This module defines the setup for tests requiring
  access to the application's data layer.

  You may define functions here to be used as helpers in
  your tests.

  Finally, if the test case interacts with the database,
  we enable the SQL sandbox, so changes done to the database
  are reverted at the end of every test. If you are using
  PostgreSQL, you can even run database tests asynchronously
  by setting `use Chironium.DataCase, async: true`, although
  this option is not recommended for other databases.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      alias Chironium.Repo

      import Chironium.DataCase
      import Ecto
      import Ecto.Changeset
      import Ecto.Query
    end
  end

  setup tags do
    Chironium.DataCase.setup_sandbox(tags)
    :ok
  end

  @doc """
  Sets up the sandbox based on the test tags.
  """
  @spec setup_sandbox(map()) :: :ok
  def setup_sandbox(tags) do
    alias Ecto.Adapters.SQL.Sandbox

    pid = Sandbox.start_owner!(Chironium.Repo, shared: not tags[:async])
    on_exit(fn -> Sandbox.stop_owner(pid) end)
  end

  @doc """
  Turns email off for the rest of the test. The flag is global application
  env, so callers must not run `async: true`.
  """
  def disable_email do
    previous = Application.get_env(:chironium, Chironium.Notifications)
    Application.put_env(:chironium, Chironium.Notifications, email_enabled?: false)

    ExUnit.Callbacks.on_exit(fn ->
      Application.put_env(:chironium, Chironium.Notifications, previous)
    end)
  end

  @doc """
  A helper that transforms changeset errors into a map of messages.

      assert {:error, changeset} = Accounts.create_user(%{password: "short"})
      assert "password is too short" in errors_on(changeset).password
      assert %{password: ["password is too short"]} = errors_on(changeset)

  """
  @spec errors_on(Ecto.Changeset.t()) :: %{optional(atom()) => [String.t()]}
  def errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, opts} ->
      Regex.replace(~r"%{(\w+)}", message, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
