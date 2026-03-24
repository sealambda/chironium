defmodule Chironium.Automation.Rule.TriggerType do
  use Ash.Type.Enum,
    values: [
      domain_event: [
        label: "Domain event",
        description: "Runs when a matching domain event is published."
      ],
      scheduled: [
        label: "Scheduled",
        description: "Runs when a scheduled evaluator selects matching records."
      ]
    ]
end
