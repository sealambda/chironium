defmodule Chironium.Automation.EventDrivenRuleTest do
  use Chironium.DataCase, async: false
  use Oban.Testing, repo: Chironium.Repo

  import Chironium.Generator

  test "creating a CRM person enqueues an automation job" do
    actor = generate(user())
    org = generate(organization(actor: actor))
    tenant_id = "org_#{org.id}"

    Chironium.Automation.Rule
    |> Ash.Changeset.for_create(
      :create,
      %{
        tenant_id: tenant_id,
        trigger_type: :domain_event,
        trigger_topic: "crm.person.created",
        conditions: %{},
        action_type: :fire_ash_action,
        action_payload: %{"target" => "noop"},
        is_active: true
      },
      authorize?: false
    )
    |> Ash.create!()

    Chironium.CRM.Person
    |> Ash.Changeset.for_create(:create, %{}, tenant: tenant_id, authorize?: false)
    |> Ash.create!()

    assert_enqueued(
      [worker: Chironium.Automation.Workers.RunRuleAction, args: %{tenant_id: tenant_id, event: "crm.person.created"}],
      2000
    )
  end
end
