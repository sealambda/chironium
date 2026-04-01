defmodule Chironium.Generator do
  use Ash.Generator

  @ash_keys [:actor, :tenant, :authorize?, :context, :scope, :upsert?, :upsert_identity]

  # -- FHIR terminology constants --

  @snomed_system "http://snomed.info/sct"

  # SNOMED-coded conditions with their display names.
  @snomed_conditions [
    {"38341003", "Hypertension"},
    {"44054006", "Type 2 diabetes mellitus"},
    {"195967001", "Asthma"},
    {"37796009", "Migraine"},
    {"161891005", "Back pain"},
    {"48694002", "Anxiety disorder"},
    {"40930008", "Hypothyroidism"},
    {"235595009", "Gastroesophageal reflux disease"},
    {"396275006", "Osteoarthritis"},
    {"61582004", "Allergic rhinitis"},
    {"35489007", "Depression"},
    {"73211009", "Diabetes mellitus"},
    {"13645005", "Chronic obstructive pulmonary disease"},
    {"84114007", "Heart failure"},
    {"49436004", "Atrial fibrillation"}
  ]

  # SNOMED-coded allergens.
  @snomed_allergens [
    {"91935009", "Allergy to peanut"},
    {"91936005", "Allergy to penicillin"},
    {"91934008", "Allergy to shellfish"},
    {"300916003", "Latex allergy"},
    {"420174000", "Allergy to wheat"},
    {"782555009", "Allergy to cow's milk protein"},
    {"294505008", "Allergy to sulfonamide"},
    {"232350006", "Allergy to house dust mite"},
    {"418689008", "Allergy to grass pollen"},
    {"232346004", "Allergy to cat dander"}
  ]

  # RxNorm-coded medications.
  @rxnorm_system "http://www.nlm.nih.gov/research/umls/rxnorm"
  @rxnorm_medications [
    {"860975", "Metformin 500mg"},
    {"314076", "Lisinopril 10mg"},
    {"904420", "Omeprazole 20mg"},
    {"966247", "Levothyroxine 50mcg"},
    {"259255", "Atorvastatin 20mg"},
    {"308136", "Amlodipine 5mg"},
    {"312938", "Sertraline 50mg"},
    {"197806", "Ibuprofen 400mg"},
    {"861007", "Metformin 1000mg"},
    {"310798", "Losartan 50mg"}
  ]

  # -- Accounts --

  def user(opts \\ []) do
    seed_generator(
      %Chironium.Accounts.User{
        email: sequence(:email, &"user-#{&1}@example.com")
      },
      overrides: opts
    )
  end

  def organization(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    name =
      data_opts[:name] ||
        StreamData.repeatedly(fn -> Faker.Company.name() end)

    slug =
      data_opts[:slug] ||
        sequence(:slug, &"org-#{&1}")

    [defaults: [name: name, slug: slug], overrides: data_opts]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Accounts.Organization, :create, &1))
  end

  def invitation(opts \\ []) do
    seed_generator(
      %Chironium.Accounts.Invitation{
        email: sequence(:invitation_email, &"invited-#{&1}@example.com"),
        invite_code: StreamData.repeatedly(fn -> Base.encode32(:crypto.strong_rand_bytes(5)) end),
        state: :pending,
        expires_at: DateTime.add(DateTime.utc_now(), 7, :day)
      },
      overrides: opts
    )
  end

  # -- Health --

  def practitioner(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        name:
          StreamData.repeatedly(fn ->
            [
              %{
                use: :official,
                family: Faker.Person.last_name(),
                given: [Faker.Person.first_name()],
                prefix: [Enum.random(["Dr.", "Prof."])]
              }
            ]
          end),
        active: true,
        birth_date: StreamData.repeatedly(fn -> random_past_date(30..65) end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Practitioner, :create, &1))
  end

  def patient(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [defaults: [], overrides: data_opts]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Patient, :create, &1))
  end

  def patient_with_person(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        person:
          StreamData.repeatedly(fn ->
            %{
              name: [
                %{
                  use: :official,
                  family: Faker.Person.last_name(),
                  given: [Faker.Person.first_name()]
                }
              ],
              gender: Enum.random([:male, :female, :other]),
              birth_date: random_past_date(1..90),
              telecom: [
                %{system: :email, value: Faker.Internet.email(), use: :home}
              ]
            }
          end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Patient, :create_patient_with_person, &1))
  end

  def care_team(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        name: StreamData.repeatedly(fn -> "#{Faker.Team.name()} Care Team" end),
        status: :active
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.CareTeam, :create, &1))
  end

  def care_team_participant(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        active: true,
        role: StreamData.repeatedly(fn -> Enum.random(["Lead", "Support", "Consultant", "Primary"]) end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.CareTeamParticipant, :create, &1))
  end

  # Uses specialized actions for typed observations (LOINC-coded).

  def observation_body_weight(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        weight_kg: StreamData.repeatedly(fn -> random_float(40.0, 150.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_body_weight, &1))
  end

  def observation_body_height(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        height_cm: StreamData.repeatedly(fn -> random_float(140.0, 210.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_body_height, &1))
  end

  def observation_chest_circumference(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        chest_circumference_cm: StreamData.repeatedly(fn -> random_float(70.0, 130.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_chest_circumference, &1))
  end

  def observation_waist_circumference(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        waist_circumference_cm: StreamData.repeatedly(fn -> random_float(55.0, 130.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_waist_circumference, &1))
  end

  def observation_hip_circumference(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        hip_circumference_cm: StreamData.repeatedly(fn -> random_float(70.0, 140.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_hip_circumference, &1))
  end

  # Generic observation for cases not covered by specialized actions.
  def observation(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        status: :final,
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end),
        value_string: StreamData.repeatedly(fn -> Faker.Lorem.sentence(3..8) end),
        note: []
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :create, &1))
  end

  def condition(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        clinical_status: StreamData.repeatedly(fn -> Enum.random([:active, :inactive, :resolved]) end),
        verification_status: :confirmed,
        code:
          StreamData.repeatedly(fn ->
            {snomed_code, display} = Enum.random(@snomed_conditions)

            %{
              coding: [%{system: @snomed_system, code: snomed_code}],
              text: display
            }
          end),
        note:
          StreamData.repeatedly(fn ->
            [%{text: Faker.Lorem.sentence(), author_string: "System", time: DateTime.utc_now()}]
          end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Condition, :create, &1))
  end

  def goal(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        lifecycle_status: StreamData.repeatedly(fn -> Enum.random([:proposed, :active, :accepted]) end),
        achievement_status: StreamData.repeatedly(fn -> Enum.random([:in_progress, :improving, :no_change]) end),
        category: StreamData.repeatedly(fn -> [Enum.random([:dietary, :behavioral, :physiotherapy])] end),
        priority: StreamData.repeatedly(fn -> Enum.random([:high_priority, :medium_priority, :low_priority]) end),
        description: StreamData.repeatedly(fn -> %{text: Faker.Lorem.sentence()} end),
        start_date: Date.utc_today(),
        due_date: StreamData.repeatedly(fn -> Date.add(Date.utc_today(), Enum.random(30..180)) end),
        note:
          StreamData.repeatedly(fn ->
            [%{text: Faker.Lorem.sentence(), author_string: "System", time: DateTime.utc_now()}]
          end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Goal, :create, &1))
  end

  def medication_statement(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        status: :recorded,
        medication:
          StreamData.repeatedly(fn ->
            {rxnorm_code, display} = Enum.random(@rxnorm_medications)

            %{
              coding: [%{system: @rxnorm_system, code: rxnorm_code}],
              text: display
            }
          end),
        note:
          StreamData.repeatedly(fn ->
            [%{text: Faker.Lorem.sentence(), author_string: "System", time: DateTime.utc_now()}]
          end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.MedicationStatement, :create, &1))
  end

  def allergy_intolerance(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        clinical_status: StreamData.repeatedly(fn -> Enum.random([:active, :inactive]) end),
        verification_status: StreamData.repeatedly(fn -> Enum.random([:confirmed, :presumed]) end),
        type: StreamData.repeatedly(fn -> Enum.random([:allergy, :intolerance]) end),
        code:
          StreamData.repeatedly(fn ->
            {snomed_code, display} = Enum.random(@snomed_allergens)

            %{
              coding: [%{system: @snomed_system, code: snomed_code}],
              text: display
            }
          end),
        note:
          StreamData.repeatedly(fn ->
            [%{text: Faker.Lorem.sentence(), author_string: "System", time: DateTime.utc_now()}]
          end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.AllergyIntolerance, :create, &1))
  end

  def nutrition_plan(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        target_kcal: StreamData.repeatedly(fn -> Enum.random(1500..3000) end),
        protein_g: StreamData.repeatedly(fn -> Enum.random(80..200) end),
        carbs_g: StreamData.repeatedly(fn -> Enum.random(150..400) end),
        fat_g: StreamData.repeatedly(fn -> Enum.random(40..120) end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.NutritionPlan, :create, &1))
  end

  def task(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        intent: StreamData.repeatedly(fn -> Enum.random([:proposal, :plan, :order]) end),
        priority: StreamData.repeatedly(fn -> Enum.random([:routine, :urgent, :asap]) end),
        description: StreamData.repeatedly(fn -> Faker.Lorem.sentence(3..8) end),
        requested_period: StreamData.repeatedly(fn -> %{start: random_past_datetime(1..30)} end),
        note:
          StreamData.repeatedly(fn ->
            [%{text: Faker.Lorem.sentence(), author_string: "System", time: DateTime.utc_now()}]
          end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Task, :create, &1))
  end

  def observation_food_preference(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        value_string: StreamData.repeatedly(fn -> Faker.Food.dish() end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_food_preference, &1))
  end

  def observation_food_aversion(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)

    [
      defaults: [
        value_string: StreamData.repeatedly(fn -> Faker.Food.ingredient() end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_food_aversion, &1))
  end

  # -- Helpers --

  defp split_opts(opts) do
    Keyword.split(opts, @ash_keys)
  end

  defp random_past_date(range) do
    days_ago = Enum.random(range) * 365
    Date.add(Date.utc_today(), -Enum.random(1..days_ago))
  end

  defp random_past_datetime(days_range) do
    days = Enum.random(days_range)
    DateTime.add(DateTime.utc_now(), -days * 86_400 + Enum.random(0..86_399), :second)
  end

  defp random_float(min, max) do
    Float.round(min + :rand.uniform() * (max - min), 1)
  end
end
