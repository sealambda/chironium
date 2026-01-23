defmodule Chironium.Core.Identity.Preparations.MagicLinkSignIn do
  @moduledoc """
  Custom sign-in preparation for magic link that looks up users via PersonProfile email.

  This allows users to sign in with ANY email in their PersonProfiles,
  not just the email currently stored in User.email.

  ## Flow

  1. Validate the magic link token.
  2. Extract email from token.
  3. Find PersonProfile with that email.
  4. Get Person from PersonProfile.
  5. Get or create User for Person.
  6. Update User.email to match the login email.
  7. Return authenticated user.
  """
  use Ash.Resource.Preparation

  import Ash.Expr
  require Ash.Query

  @impl true
  def prepare(query, _opts, _context) do
    token = Ash.Query.get_argument(query, :token)

    case validate_and_extract_email(token) do
      {:ok, email} ->
        case find_user_by_profile_email(email) do
          {:ok, user} ->
            # Update User.email to the login email if different.
            maybe_sync_email(user, email)
            # Filter query to return this user.
            Ash.Query.filter(query, expr(id == ^user.id))

          {:error, :not_found} ->
            # No user found - add error to query.
            Ash.Query.add_error(query,
              field: :token,
              message: "no account found with this email"
            )

          {:error, reason} ->
            Ash.Query.add_error(query,
              field: :token,
              message: "authentication failed: #{inspect(reason)}"
            )
        end

      {:error, reason} ->
        Ash.Query.add_error(query,
          field: :token,
          message: "invalid or expired token: #{inspect(reason)}"
        )
    end
  end

  defp validate_and_extract_email(token) do
    # Use AshAuthentication's token validation.
    case AshAuthentication.Jwt.verify(token, Chironium.Core.Identity.User) do
      {:ok, %{"sub" => _subject, "email" => email}, _resource} ->
        {:ok, email}

      {:ok, claims, _resource} ->
        # Try to get email from claims.
        case Map.get(claims, "email") do
          nil -> {:error, :no_email_in_token}
          email -> {:ok, email}
        end

      :error ->
        {:error, :invalid_token}
    end
  end

  defp find_user_by_profile_email(email) do
    # Find PersonProfile with this email, then get Person, then User.
    Chironium.Core.PersonProfile
    |> Ash.Query.filter(expr(email == ^email))
    |> Ash.Query.load(person: :user)
    |> Ash.read_one(authorize?: false)
    |> case do
      {:ok, nil} ->
        {:error, :not_found}

      {:ok, %{person: %{user: nil} = person}} ->
        # Person exists but no User - create one.
        create_user_for_person(person, email)

      {:ok, %{person: %{user: user}}} ->
        {:ok, user}

      {:error, error} ->
        {:error, error}
    end
  end

  defp create_user_for_person(person, email) do
    Chironium.Core.Identity.User
    |> Ash.Changeset.for_create(:create_for_person, %{person_id: person.id, email: email})
    |> Ash.create(authorize?: false)
  end

  defp maybe_sync_email(user, email) do
    # If login email differs from stored User.email, update it.
    current_email = String.downcase(to_string(user.email))
    login_email = String.downcase(email)

    if current_email != login_email do
      user
      |> Ash.Changeset.for_update(:update_email, %{email: login_email})
      |> Ash.update(authorize?: false)
    end

    :ok
  end
end
