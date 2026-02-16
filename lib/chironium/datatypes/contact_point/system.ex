defmodule Chironium.Datatypes.ContactPoint.System do
  @moduledoc """
  https://hl7.org/fhir/R5/valueset-contact-point-system.html
  """

  use Ash.Type.Enum,
    values: [
      phone: [
        label: "Phone",
        description:
          "The value is a telephone number used for voice calls. Use of full international numbers starting with + is recommended to enable automatic dialing support but not required."
      ],
      fax: [
        label: "Fax",
        description:
          "The value is a fax machine. Use of full international numbers starting with + is recommended to enable automatic dialing support but not required."
      ],
      email: [
        label: "Email",
        description: "The value is an email address."
      ],
      pager: [
        label: "Pager",
        description:
          "The value is a pager number. These may be local pager numbers that are only usable on a particular pager system."
      ],
      url: [
        label: "URL",
        description:
          "A contact that is not a phone, fax, pager or email address and is expressed as a URL. This is intended for various institutional or personal contacts including web sites, blogs, Skype, Twitter, Facebook, etc. Do not use for email addresses."
      ],
      sms: [
        label: "SMS",
        description:
          "A contact that can be used for sending a sms message (e.g. mobile phones, some landlines)."
      ],
      other: [
        label: "Other",
        description:
          "A contact that is not a phone, fax, page or email address and is not expressible as a URL. E.g. Internal mail address. This SHOULD NOT be used for contacts that are expressible as a URL (e.g. Skype, Twitter, Facebook, etc.) Extensions may be used to distinguish 'other' contact types."
      ]
    ]

  def graphql_type(_), do: :contact_point_system
end
