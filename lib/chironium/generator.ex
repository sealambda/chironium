defmodule Chironium.Generator do
  use Ash.Generator

  @ash_keys [:actor, :tenant, :authorize?, :context, :scope, :upsert?, :upsert_identity]

  # -- FHIR terminology constants --
  # Small samples of SNOMED CT, RxNorm and LOINC codes for generated sample data.
  # Each terminology has its own license; see NOTICE.md before adding more.

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
    {"91935009", "Peanut"},
    {"91936005", "Penicillin"},
    {"91934008", "Shellfish"},
    {"300916003", "Latex allergy"},
    {"420174000", "Wheat"},
    {"782555009", "Cow's milk protein"},
    {"294505008", "Sulfonamide"},
    {"232350006", "House dust mite"},
    {"418689008", "Grass pollen"},
    {"232346004", "Cat dander"}
  ]

  # RxNorm-coded medications.
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

  # Seed catalogs used by mix seed tasks.
  @seed_supplements [
    "Vitamin D3",
    "Omega-3 fish oil",
    "Magnesium glycinate",
    "Creatine monohydrate"
  ]

  @seed_food_preferences [
    "Legumes",
    "Whole grains",
    "Greek yogurt",
    "Seasonal fruit",
    "Leafy greens"
  ]

  @seed_food_aversions [
    "Deep-fried foods",
    "Sugary drinks",
    "Ultra-processed snacks",
    "Energy drinks",
    "Excess sodium"
  ]

  @seed_clinical_note_templates [
    "Sleep quality has improved over the last two weeks.",
    "Patient reports better meal regularity and hydration.",
    "Exercise adherence is consistent and tolerated well.",
    "Energy levels are stable with fewer afternoon crashes."
  ]

  @seed_goal_descriptions [
    "Increase weekly strength training consistency",
    "Improve meal quality with more whole foods",
    "Reach and maintain a stable healthy weight",
    "Improve sleep quality and sleep duration"
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

  def seed_medication_labels do
    Enum.map(@rxnorm_medications, fn {_code, label} -> label end)
  end

  def seed_supplement_labels do
    @seed_supplements
  end

  def seed_allergy_labels do
    Enum.map(@snomed_allergens, fn {_code, label} -> label end)
  end

  def seed_intolerance_labels do
    ["Lactose", "Gluten", "Fructose", "Histamine"]
  end

  def seed_condition_codes do
    Enum.map(@snomed_conditions, fn {code, display} ->
      %{coding: [%{system: @snomed_system, code: code}], text: display}
    end)
  end

  def seed_food_preferences do
    @seed_food_preferences
  end

  def seed_food_aversions do
    @seed_food_aversions
  end

  def seed_clinical_note_templates do
    @seed_clinical_note_templates
  end

  def seed_goal_descriptions do
    @seed_goal_descriptions
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
              birth_date: random_past_date(18..60),
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
        role:
          StreamData.repeatedly(fn ->
            Enum.random(["Lead", "Support", "Consultant", "Primary"])
          end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.CareTeamParticipant, :create, &1))
  end

  # Uses specialized actions for typed observations (LOINC-coded).

  def observation_body_weight(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        weight_kg: StreamData.repeatedly(fn -> random_float(60.0, 90.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end),
        note: StreamData.repeatedly(fn -> [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)] end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_body_weight, &1))
  end

  def observation_body_height(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        height_cm: StreamData.repeatedly(fn -> random_float(155.0, 190.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end),
        note: StreamData.repeatedly(fn -> [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)] end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_body_height, &1))
  end

  def observation_chest_circumference(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        chest_circumference_cm: StreamData.repeatedly(fn -> random_float(82.0, 110.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end),
        note: StreamData.repeatedly(fn -> [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)] end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_chest_circumference, &1))
  end

  def observation_waist_circumference(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        waist_circumference_cm: StreamData.repeatedly(fn -> random_float(65.0, 100.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end),
        note: StreamData.repeatedly(fn -> [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)] end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_waist_circumference, &1))
  end

  def observation_hip_circumference(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        hip_circumference_cm: StreamData.repeatedly(fn -> random_float(85.0, 115.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end),
        note: StreamData.repeatedly(fn -> [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)] end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_hip_circumference, &1))
  end

  def observation_arm_circumference(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        arm_circumference_cm: StreamData.repeatedly(fn -> random_float(25.0, 38.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end),
        note: StreamData.repeatedly(fn -> [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)] end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_arm_circumference, &1))
  end

  def observation_thigh_circumference(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        thigh_circumference_cm: StreamData.repeatedly(fn -> random_float(45.0, 68.0) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end),
        note: StreamData.repeatedly(fn -> [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)] end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_thigh_circumference, &1))
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
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    StreamData.repeatedly(fn ->
      temporal = random_condition_temporal()

      params =
        [
          verification_status: :confirmed,
          code: random_condition_code(),
          note: [
            Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)
          ]
        ]
        |> Keyword.merge(temporal)
        |> Keyword.merge(data_opts)

      Chironium.Health.Condition
      |> Ash.Changeset.for_create(:create, Map.new(params), ash_opts)
    end)
  end

  def goal(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        lifecycle_status:
          StreamData.repeatedly(fn -> Enum.random([:proposed, :active, :accepted]) end),
        achievement_status:
          StreamData.repeatedly(fn -> Enum.random([:in_progress, :improving, :no_change]) end),
        category:
          StreamData.repeatedly(fn -> [Enum.random([:dietary, :behavioral, :physiotherapy])] end),
        priority:
          StreamData.repeatedly(fn ->
            Enum.random([:high_priority, :medium_priority, :low_priority])
          end),
        description: StreamData.repeatedly(fn -> %{text: Enum.random(@seed_goal_descriptions)} end),
        start_date: Date.utc_today(),
        due_date:
          StreamData.repeatedly(fn -> Date.add(Date.utc_today(), Enum.random(30..180)) end),
        note:
          StreamData.repeatedly(fn ->
            [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)]
          end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Goal, :create, &1))
  end

  def medication_statement(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    StreamData.repeatedly(fn ->
      temporal = random_medication_temporal()
      medications = seed_medication_labels()
      supplements = seed_supplement_labels()
      all_labels = medications ++ supplements

      params =
        [
          status: :recorded,
          medication: %{text: Enum.random(all_labels)},
          note: [
            Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)
          ]
        ]
        |> Keyword.merge(temporal)
        |> Keyword.merge(data_opts)

      Chironium.Health.MedicationStatement
      |> Ash.Changeset.for_create(:create, Map.new(params), ash_opts)
    end)
  end

  def medication_request(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    StreamData.repeatedly(fn ->
      medications = seed_medication_labels()

      params =
        [
          status: Enum.random([:active, :active, :completed]),
          intent: :order,
          course_of_therapy_type: Enum.random([:continuous, :acute, :seasonal]),
          medication: %{text: Enum.random(medications)},
          dosage_instruction: [random_dosage()],
          dispense_request: %{
            number_of_repeats_allowed: Enum.random(0..5),
            quantity: %{value: Enum.random([28, 30, 60, 90]), unit: "tablet"}
          },
          substitution: random_substitution(),
          authored_on: random_past_datetime(0..365),
          note: [
            Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)
          ]
        ]
        |> Keyword.merge(data_opts)

      Chironium.Health.MedicationRequest
      |> Ash.Changeset.for_create(:create, Map.new(params), ash_opts)
    end)
  end

  defp random_dosage do
    {frequency, period, period_unit, text} =
      Enum.random([
        {1, 1, :d, "Take one tablet by mouth once daily"},
        {2, 1, :d, "Take one tablet by mouth twice daily"},
        {1, 8, :h, "Take one tablet by mouth every 8 hours"},
        {1, 1, :wk, "Take one tablet by mouth once weekly"}
      ])

    %{
      text: text,
      frequency: frequency,
      period: period,
      period_unit: period_unit,
      dose_quantity: %{value: 1, unit: "tablet"}
    }
  end

  @substitution_system "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution"

  defp random_substitution do
    {code, text} =
      Enum.random([
        {"G", "generic composition"},
        {"TE", "therapeutic alternative"},
        {"N", "none"}
      ])

    %{
      allowed_codeable_concept: %{
        coding: [%{system: @substitution_system, code: code}],
        text: text
      }
    }
  end

  def allergy_intolerance(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    StreamData.repeatedly(fn ->
      temporal = random_allergy_intolerance_temporal()
      allergy_labels = seed_allergy_labels()
      intolerance_labels = seed_intolerance_labels()

      type = Enum.random([:allergy, :intolerance])
      label = if type == :allergy, do: Enum.random(allergy_labels), else: Enum.random(intolerance_labels)

      params =
        [
          clinical_status: Enum.random([:active, :inactive]),
          verification_status: Enum.random([:confirmed, :presumed]),
          type: type,
          code: %{text: label},
          note: [
            Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)
          ]
        ]
        |> Keyword.merge(temporal)
        |> Keyword.merge(data_opts)

      Chironium.Health.AllergyIntolerance
      |> Ash.Changeset.for_create(:create, Map.new(params), ash_opts)
    end)
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
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        intent: StreamData.repeatedly(fn -> Enum.random([:proposal, :plan, :order]) end),
        priority: StreamData.repeatedly(fn -> Enum.random([:routine, :urgent, :asap]) end),
        description: StreamData.repeatedly(fn -> Faker.Lorem.sentence(3..8) end),
        requested_period: StreamData.repeatedly(fn -> %{start: random_past_datetime(1..30)} end),
        note:
          StreamData.repeatedly(fn ->
            [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)]
          end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Task, :create, &1))
  end

  def observation_food_preference(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        value_string: StreamData.repeatedly(fn -> Enum.random(@seed_food_preferences) end),
        value_codeable_concept: nil,
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end),
        note: StreamData.repeatedly(fn -> [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)] end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_food_preference, &1))
  end

  def observation_food_aversion(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        value_string: StreamData.repeatedly(fn -> Enum.random(@seed_food_aversions) end),
        value_codeable_concept: nil,
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(1..365) end),
        note: StreamData.repeatedly(fn -> [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)] end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_food_aversion, &1))
  end

  def observation_menstrual_period_start(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(7..120) end),
        note: StreamData.repeatedly(fn -> [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)] end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_menstrual_period_start, &1))
  end

  def observation_menstrual_period_duration(opts \\ []) do
    {ash_opts, data_opts} = split_opts(opts)
    author_fields = note_author(Keyword.get(ash_opts, :actor))

    [
      defaults: [
        duration_days: StreamData.repeatedly(fn -> Enum.random(3..8) end),
        effective_date_time: StreamData.repeatedly(fn -> random_past_datetime(7..120) end),
        note: StreamData.repeatedly(fn -> [Map.merge(%{text: Faker.Lorem.sentence(), time: DateTime.utc_now()}, author_fields)] end)
      ],
      overrides: data_opts
    ]
    |> Keyword.merge(ash_opts)
    |> then(&changeset_generator(Chironium.Health.Observation, :log_menstrual_period_duration, &1))
  end

  # -- Helpers --

  defp split_opts(opts) do
    Keyword.split(opts, @ash_keys)
  end

  defp note_author(nil), do: %{author_string: "System"}
  defp note_author(%{id: id}), do: %{author_reference: to_string(id)}

  defp random_past_date(range) do
    days_ago = Enum.random(range) * 365 + Enum.random(0..364)
    Date.add(Date.utc_today(), -days_ago)
  end

  defp random_past_datetime(days_range) do
    days = Enum.random(days_range)
    DateTime.add(DateTime.utc_now(), -days * 86_400 + Enum.random(0..86_399), :second)
  end

  defp random_float(min, max) do
    Float.round(min + :rand.uniform() * (max - min), 1)
  end

  defp random_condition_code do
    {code, display} = Enum.random(@snomed_conditions)
    %{coding: [%{system: @snomed_system, code: code}], text: display}
  end

  # Returns a keyword list with all condition temporal fields plus clinical_status.
  # onset, abatement, and clinical_status are generated coherently:
  # - resolved/inactive/remission status only appears when abatement is set
  # - abatement is always after onset when an onset datetime is known
  # - recorded_date is always on or after onset_date_time
  defp random_condition_temporal do
    onset_days_ago = Enum.random(30..3650)
    onset_dt = DateTime.add(DateTime.utc_now(), -onset_days_ago * 86_400, :second)

    {onset_date_time, onset_age, onset_period} =
      case Enum.random([:date_time, :date_time, :age, :period, :none]) do
        :date_time ->
          {onset_dt, nil, nil}

        :age ->
          years = max(1, div(onset_days_ago, 365))
          {nil, %{value: years, code: :a}, nil}

        :period ->
          {nil, nil, %{start: onset_dt}}

        :none ->
          {nil, nil, nil}
      end

    recorded_date =
      case onset_date_time do
        nil ->
          DateTime.add(DateTime.utc_now(), -Enum.random(0..365) * 86_400, :second)

        dt ->
          days_since = div(DateTime.diff(DateTime.utc_now(), dt, :second), 86_400)
          delay = if days_since > 0, do: Enum.random(0..days_since), else: 0
          DateTime.add(dt, delay * 86_400, :second)
      end

    # 40% chance the condition has resolved or entered remission.
    if Enum.random(1..10) <= 4 do
      onset_ref = onset_date_time || (onset_period && onset_period[:start])

      abatement_dt =
        case onset_ref do
          nil ->
            DateTime.add(DateTime.utc_now(), -Enum.random(1..onset_days_ago) * 86_400, :second)

          dt ->
            days_since = max(1, div(DateTime.diff(DateTime.utc_now(), dt, :second), 86_400))
            DateTime.add(dt, Enum.random(1..days_since) * 86_400, :second)
        end

      {abatement_date_time, abatement_period} =
        if Enum.random(1..2) == 1,
          do: {abatement_dt, nil},
          else: {nil, %{start: abatement_dt}}

      [
        clinical_status: Enum.random([:inactive, :remission, :resolved]),
        onset_date_time: onset_date_time,
        onset_age: onset_age,
        onset_period: onset_period,
        abatement_date_time: abatement_date_time,
        abatement_period: abatement_period,
        recorded_date: recorded_date
      ]
    else
      [
        clinical_status: Enum.random([:active, :recurrence, :relapse]),
        onset_date_time: onset_date_time,
        onset_age: onset_age,
        onset_period: onset_period,
        abatement_date_time: nil,
        abatement_period: nil,
        recorded_date: recorded_date
      ]
    end
  end

  # Returns a keyword list with all allergy intolerance temporal fields.
  # recorded_date is always on or after onset_date_time.
  # last_occurrence is always on or after onset_date_time when onset is known.
  defp random_allergy_intolerance_temporal do
    onset_days_ago = Enum.random(30..3650)
    onset_dt = DateTime.add(DateTime.utc_now(), -onset_days_ago * 86_400, :second)

    {onset_date_time, onset_age, onset_period} =
      case Enum.random([:date_time, :date_time, :age, :period, :none]) do
        :date_time ->
          {onset_dt, nil, nil}

        :age ->
          years = max(1, div(onset_days_ago, 365))
          {nil, %{value: years, code: :a}, nil}

        :period ->
          {nil, nil, %{start: onset_dt}}

        :none ->
          {nil, nil, nil}
      end

    recorded_date =
      case onset_date_time do
        nil ->
          DateTime.add(DateTime.utc_now(), -Enum.random(0..365) * 86_400, :second)

        dt ->
          days_since = div(DateTime.diff(DateTime.utc_now(), dt, :second), 86_400)
          delay = if days_since > 0, do: Enum.random(0..days_since), else: 0
          DateTime.add(dt, delay * 86_400, :second)
      end

    # 50% chance there is a recorded last occurrence.
    last_occurrence =
      if Enum.random(1..2) == 1 do
        case onset_date_time do
          nil ->
            DateTime.add(DateTime.utc_now(), -Enum.random(0..365) * 86_400, :second)

          dt ->
            days_since = max(1, div(DateTime.diff(DateTime.utc_now(), dt, :second), 86_400))
            DateTime.add(dt, Enum.random(0..days_since) * 86_400, :second)
        end
      end

    [
      onset_date_time: onset_date_time,
      onset_age: onset_age,
      onset_period: onset_period,
      recorded_date: recorded_date,
      last_occurrence: last_occurrence
    ]
  end

  # Returns a keyword list with medication statement temporal fields.
  # date_asserted is always on or after effective_date_time when set.
  defp random_medication_temporal do
    effective_days_ago = Enum.random(1..730)
    effective_dt = DateTime.add(DateTime.utc_now(), -effective_days_ago * 86_400, :second)

    {effective_date_time, effective_period} =
      case Enum.random([:date_time, :period, :none]) do
        :date_time ->
          {effective_dt, nil}

        :period ->
          # 50% chance the medication course has ended; requires at least 7 days of history.
          end_dt =
            if Enum.random(1..2) == 1 && effective_days_ago > 7 do
              duration_days = Enum.random(7..min(365, effective_days_ago))
              candidate = DateTime.add(effective_dt, duration_days * 86_400, :second)
              if DateTime.compare(candidate, DateTime.utc_now()) == :lt, do: candidate
            end

          period =
            if end_dt,
              do: %{start: effective_dt, end: end_dt},
              else: %{start: effective_dt}

          {nil, period}

        :none ->
          {nil, nil}
      end

    date_asserted =
      case effective_date_time do
        nil ->
          DateTime.add(DateTime.utc_now(), -Enum.random(0..180) * 86_400, :second)

        dt ->
          days_since = div(DateTime.diff(DateTime.utc_now(), dt, :second), 86_400)
          delay = if days_since > 0, do: Enum.random(0..days_since), else: 0
          DateTime.add(dt, delay * 86_400, :second)
      end

    [
      effective_date_time: effective_date_time,
      effective_period: effective_period,
      date_asserted: date_asserted
    ]
  end
end
