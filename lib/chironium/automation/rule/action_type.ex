defmodule Chironium.Automation.Rule.ActionType do
  use Ash.Type.Enum,
    values: [
      fire_ash_action: [
        label: "Fire Ash action",
        description: "Runs a whitelisted Ash action with the configured payload."
      ],
      run_reactor: [
        label: "Run Reactor",
        description: "Runs a configured Reactor workflow for complex orchestrations."
      ],
      http_webhook: [
        label: "HTTP webhook",
        description: "Sends the payload to a configured outbound webhook."
      ]
    ]
end
