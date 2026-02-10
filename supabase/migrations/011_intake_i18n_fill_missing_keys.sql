insert into platform_settings (key, value)
values ('intake_i18n_copy', '{}'::jsonb)
on conflict (key) do nothing;

update platform_settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{am}',
  coalesce(value->'am', '{}'::jsonb) || jsonb_build_object(
    'incident_type_group_label', 'ይህ ሪፖርት ስለ',
    'incident_type_violation_option', 'የተፈጠረ ጥሰት',
    'incident_type_risk_option', 'አደጋ',
    'incident_type_both_option', 'ሁለቱም',
    'subject_placeholder', 'ርዕስ',
    'description_placeholder', 'መግለጫ',
    'incident_start_date_label', 'የክስተቱ መጀመሪያ ቀን',
    'time_label', 'ሰዓት',
    'accessibility_title', 'ተደራሽነት',
    'phone_number_placeholder', 'ስልክ ቁጥር',
    'country_of_residence_placeholder', 'የመኖሪያ አገር',
    'age_placeholder', 'እድሜ',
    'gender_placeholder', 'ጾታ',
    'gender_male_option', 'ወንድ',
    'gender_female_option', 'ሴት',
    'reporting_for_someone_else_checkbox', 'ለሌላ ሰው በመወከል እየሪፖርት ነኝ።',
    'relationship_to_affected_person_placeholder', 'ከተጎጂው ጋር ያለዎት ግንኙነት',
    'reason_for_representation_placeholder', 'ለመወከል ምክንያት',
    'represented_person_email_placeholder', 'የተወከለው ሰው ኢሜይል',
    'represented_person_password_placeholder', 'የተወከለው ሰው የይለፍ ቃል',
    'represented_person_name_placeholder', 'የተወከለው ሰው ስም',
    'represented_person_phone_placeholder', 'የተወከለው ሰው ስልክ',
    'incident_company_label', 'የክስተቱ ኩባንያ',
    'select_company_placeholder', 'ኩባንያ ይምረጡ',
    'add_company_button', 'ኩባንያ ጨምር',
    'incident_company_employment_label', 'እርስዎ (ወይም ተጎጂው) በዚህ ኩባንያ ውስጥ ይሰራሉ?',
    'option_none', 'ምንም',
    'worksite_label', 'የስራ ቦታ',
    'add_new_worksite_button', 'አዲስ የስራ ቦታ ጨምር',
    'worksite_employment_label', 'በዚህ የስራ ቦታ ውስጥ ይሰራሉ?'
  ),
  true
)
where key = 'intake_i18n_copy';
