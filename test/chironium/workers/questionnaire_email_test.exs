defmodule Chironium.Workers.QuestionnaireEmailTest do
  use Chironium.DataCase, async: false
  use Oban.Testing, repo: Chironium.Repo

  import Chironium.QuestionnaireRequestFixtures
  import Swoosh.TestAssertions

  alias Chironium.Workers.NotificationEmailWorker

  setup do
    ctx = organization_context()
    patient = patient(ctx, "ana@example.com")
    practitioner = practitioner_actor(ctx, patient)
    task = request!(ctx, practitioner, patient, questionnaire(ctx), %{message: "See you soon"})

    Map.merge(ctx, %{task: task, email_access: access(task, :email)})
  end

  defp job_args(ctx) do
    %{
      "type" => "questionnaire_requested",
      "params" => %{"guest_access_id" => ctx.email_access.id, "tenant" => ctx.tenant}
    }
  end

  test "emails a sign-in link minted at send time", ctx do
    assert :ok = perform_job(NotificationEmailWorker, job_args(ctx))

    assert_email_sent(fn email ->
      assert email.to == [{"", "ana@example.com"}]
      assert email.subject == "#{ctx.organization.name} sent you a questionnaire"
      assert email.text_body =~ "Dr. Rivera"
      assert email.text_body =~ "See you soon"

      [url] = Regex.run(~r{https?://\S+/portal/sign-in\?token=[^\s"<>)\]]+}, email.html_body)

      assert {:ok, guest_access} =
               url |> String.replace("&amp;", "&") |> token_from_url() |> sign_in()

      assert guest_access.id == ctx.email_access.id
    end)
  end

  test "uses the organization's locale", ctx do
    ctx.organization
    |> Ash.Changeset.for_update(:update, %{preferred_locale: "es"}, authorize?: false)
    |> Ash.update!()

    assert :ok = perform_job(NotificationEmailWorker, job_args(ctx))

    assert_email_sent(subject: "#{ctx.organization.name} te envió un cuestionario")
  end

  test "dates the link's expiry in the organization's timezone", ctx do
    ctx.organization
    |> Ash.Changeset.for_update(:update, %{timezone: "Europe/Madrid"}, authorize?: false)
    |> Ash.update!()

    # 23:30 UTC is already the next day in Madrid.
    expires_at = %{DateTime.add(DateTime.utc_now(), 10, :day) | hour: 23, minute: 30}
    expire!(ctx.email_access, expires_at)
    {:ok, madrid_day} = Chironium.Cldr.Date.to_string(Date.add(expires_at, 1), format: :long)

    assert :ok = perform_job(NotificationEmailWorker, job_args(ctx))

    assert_email_sent(fn email -> assert email.text_body =~ madrid_day end)
  end

  test "does not send once the link was used or revoked", ctx do
    open_link(ctx.task)

    assert {:cancel, _} = perform_job(NotificationEmailWorker, job_args(ctx))
    refute_email_sent()
  end

  test "does not send once the access expired", ctx do
    expire!(ctx.email_access)

    assert {:cancel, _} = perform_job(NotificationEmailWorker, job_args(ctx))
    refute_email_sent()
  end
end
