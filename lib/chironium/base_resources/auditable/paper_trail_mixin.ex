defmodule Chironium.BaseResources.Auditable.PaperTrailMixin do
  def graphql(type) do
    quote do
      graphql do
        type "#{unquote(type)}_version" |> String.to_atom()
        derive_filter? false
        derive_sort? false
      end
    end
  end
end
