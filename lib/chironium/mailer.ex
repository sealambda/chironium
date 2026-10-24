defmodule Chironium.Mailer do
  use Swoosh.Mailer, otp_app: :chironium

  @doc "The sender of transactional emails, as `{name, address}`."
  def from do
    config = Application.get_env(:chironium, :email_from, [])

    {Keyword.get(config, :name, "Chironium"),
     Keyword.get(config, :address, "chironium@updates.appfor.it")}
  end
end
