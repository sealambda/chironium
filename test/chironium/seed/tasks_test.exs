defmodule Chironium.Seed.TasksTest do
  use Chironium.DataCase, async: false

  import Chironium.QuestionnaireRequestFixtures

  alias Chironium.Health.Task

  test "seeds ready reminders that the pending list shows" do
    ctx = organization_context()
    patient = patient(ctx)

    Chironium.Seed.Tasks.seed(ctx.tenant, [patient], [ctx.owner])

    tasks = Ash.read!(Task, tenant: ctx.tenant, authorize?: false)
    assert tasks != []
    assert Enum.all?(tasks, &(&1.status == :ready))

    pending = Ash.read!(Task, action: :pending, tenant: ctx.tenant, actor: ctx.owner)
    assert length(pending) == length(tasks)
  end
end
