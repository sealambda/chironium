defmodule Chironium.Accounts.GuestAccess do
  @moduledoc """
  A single-use sign-in link that lets a principal act without an account.

  v1 issues one access per questionnaire request and delivery channel. Opening
  the link and confirming signs the recipient in as their `Patient` until the
  response is submitted, the request is cancelled, or `expires_at` passes.
  Claiming one access revokes its siblings, so a request has exactly one session.

  The magic-link and session token lifetimes are static ceilings (14 days, the
  session cookie's `max_age`). Each access's real window is `expires_at`,
  enforced by the sign-in and session read filters. Tokens are never stored
  here: they are minted on demand by `sign_in_url/1`.

  Stored in the public schema because AshAuthentication resolves the session
  subject before the tenant is known. See `docs/patient-questionnaire-links.md`.
  """

  use Chironium.BaseResources.Auditable,
    otp_app: :chironium,
    domain: Chironium.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshAuthentication, AshPaperTrail.Resource]

  require Ash.Query

  alias Chironium.Accounts.GuestAccess.Changes.RevokeSiblings
  alias Chironium.Accounts.GuestAccess.Changes.RevokeTokens

  authentication do
    subject_name :guest

    tokens do
      enabled? true
      token_resource Chironium.Accounts.Token
      signing_secret Chironium.Secrets
      store_all_tokens? true
      require_token_presence_for_authentication? true
      token_lifetime {14, :days}
    end

    strategies do
      magic_link do
        # The primary key is the identity: a link is tied to one access record.
        identity_field :id
        # Sign-in is a POST from a confirm page, so link previewers can't consume it.
        require_interaction? true
        single_use_token? true
        registration_enabled? false
        token_lifetime {14, :days}

        # Links are minted when a request is sent, never through the strategy's
        # request phase, which policies forbid.
        sender fn _guest_access, _token, _opts -> :ok end
      end
    end
  end

  postgres do
    table "guest_accesses"

    custom_indexes do
      index [:task_id]
    end
  end

  paper_trail do
    mixin {Chironium.BaseResources.Auditable.PaperTrailMixin, :version_resource, [:guest_access]}
  end

  code_interface do
    define :issue
    define :claim
    define :revoke
  end

  actions do
    defaults [:read]

    read :get_by_subject do
      description "Loads the access behind a session token, while the session is live."
      argument :subject, :string, allow_nil?: false
      get? true
      prepare AshAuthentication.Preparations.FilterBySubject
      filter expr(not is_nil(claimed_at) and is_nil(revoked_at) and expires_at > now())
    end

    read :request_magic_link do
      description "Required by the magic link strategy. Forbidden by policy."
      argument :id, Ash.Type.UUIDv7, allow_nil?: false
      prepare AshAuthentication.Strategy.MagicLink.RequestPreparation
    end

    read :sign_in_with_magic_link do
      description "Signs in with a link that is unclaimed and still active."
      argument :token, :string, allow_nil?: false, sensitive?: true
      filter expr(is_nil(claimed_at) and is_nil(revoked_at) and expires_at > now())
      prepare AshAuthentication.Strategy.MagicLink.SignInPreparation

      metadata :token, :string do
        allow_nil? false
      end
    end

    create :issue do
      description "Issues an access for one delivery channel. Internal only."

      accept [
        :organization_id,
        :principal_type,
        :principal_id,
        :task_id,
        :channel,
        :expires_at
      ]

      validate one_of(:principal_type, [:patient])
    end

    update :claim do
      description "Marks the access used and revokes its siblings for the same task."
      require_atomic? false

      # A concurrent second claim matches no row and fails as stale.
      change filter(expr(is_nil(claimed_at) and is_nil(revoked_at) and expires_at > now()))
      change set_attribute(:claimed_at, &DateTime.utc_now/0)
      change RevokeSiblings
    end

    update :revoke do
      description "Ends the access and every session or link token minted for it."
      require_atomic? false

      change set_attribute(:revoked_at, &DateTime.utc_now/0)
      change RevokeTokens
    end
  end

  policies do
    # The session and sign-in reads are the only way in; everything else is
    # internal and runs with `authorize?: false`.
    bypass [
      action([:get_by_subject, :sign_in_with_magic_link]),
      AshAuthentication.Checks.AshAuthenticationInteraction
    ] do
      authorize_if always()
    end
  end

  attributes do
    attribute :principal_type, Chironium.Accounts.PrincipalType do
      description "The kind of principal the link signs in as."
      allow_nil? false
      public? true
    end

    attribute :principal_id, :uuid do
      description "The principal the link signs in as, in the organization's tenant."
      allow_nil? false
      public? true
    end

    attribute :task_id, :uuid do
      description "The task this access was issued for; it limits what the session can see."
      allow_nil? false
      public? true
    end

    attribute :channel, Chironium.Accounts.GuestAccess.Channel do
      allow_nil? false
      public? true
    end

    attribute :expires_at, :utc_datetime_usec do
      description "When the link and any session it started stop working."
      allow_nil? false
      public? true
    end

    attribute :claimed_at, :utc_datetime_usec do
      description "When the link was used to sign in."
      public? true
    end

    attribute :revoked_at, :utc_datetime_usec do
      description "When the access was ended by submit, cancel, reissue or sign-out."
      public? true
    end
  end

  relationships do
    belongs_to :organization, Chironium.Accounts.Organization do
      allow_nil? false
      public? true
    end
  end

  @doc "Returns the tenant the access's principal lives in."
  def tenant(%{organization_id: organization_id}), do: "org_#{organization_id}"

  @doc """
  Mints a single-use sign-in token and returns the portal confirm URL.

  Minting is cheap, so tokens are created at send time and never persisted
  anywhere but the token store.
  """
  def sign_in_url(guest_access) do
    strategy = AshAuthentication.Info.strategy!(__MODULE__, :magic_link)

    case AshAuthentication.Strategy.MagicLink.request_token_for(strategy, guest_access) do
      {:ok, token} ->
        {:ok, "#{ChironiumWeb.Endpoint.url()}/portal/sign-in?#{URI.encode_query(token: token)}"}

      :error ->
        {:error, "Could not mint a sign-in token for guest access #{guest_access.id}."}
    end
  end

  @doc "Revokes every active access issued for a task. Returns `:ok`."
  def revoke_all_for_task(task_id, opts \\ []) do
    __MODULE__
    |> Ash.Query.filter(task_id == ^task_id and is_nil(revoked_at))
    |> Ash.read!(authorize?: false)
    |> Enum.each(&revoke!(&1, Keyword.merge([authorize?: false], opts)))
  end
end
