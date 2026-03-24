defmodule Chironium.Automation.ExecutionLog.Status do
  use Ash.Type.Enum,
    values: [
      pending: [
        label: "Pending",
        description: "Execution has been queued but not finished."
      ],
      success: [
        label: "Success",
        description: "Execution completed successfully."
      ],
      failed: [
        label: "Failed",
        description: "Execution failed and captured an error message."
      ]
    ]
end
