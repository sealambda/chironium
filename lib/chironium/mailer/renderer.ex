defmodule Chironium.Mailer.Renderer do
  @moduledoc """
  Renders HEEx email components into HTML with inlined CSS and a plain-text variant.
  """

  @doc """
  Renders a function component into an HTML string with inlined CSS
  and a plain-text fallback.

  Returns `%{html: String.t(), text: String.t()}`.
  """
  @spec render(function(), map()) :: %{html: String.t(), text: String.t()}
  def render(component, assigns \\ %{}) do
    html =
      component
      |> Phoenix.LiveView.TagEngine.component(
        assigns,
        {__ENV__.module, __ENV__.function, __ENV__.file, __ENV__.line}
      )
      |> Phoenix.HTML.Safe.to_iodata()
      |> IO.iodata_to_binary()
      |> Premailex.to_inline_css()

    text = Premailex.to_text(html)

    %{html: html, text: text}
  end
end
