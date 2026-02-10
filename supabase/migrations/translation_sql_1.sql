insert into platform_settings (key, value)
values ('intake_i18n_copy', '{}'::jsonb)
on conflict (key) do nothing;

with required(key, fallback) as (
  values
    ('step_1_title','Languages'),
    ('step_2_title','Policies'),
    ('step_3_title','Stakeholder'),
    ('step_4_title','Reported company'),
    ('step_5_title','NGO representation'),
    ('step_6_title','Direct & indirect'),
    ('step_7_title','Incident details'),
    ('step_8_title','Review'),
    ('step_9_title','Complete'),

    ('about_whitebox_title','About WhiteBox'),
    ('about_whitebox_more_info','Learn more about WhiteBox and this reporting process.'),

    ('accessibility_title','Accessibility'),
    ('accessibility_audio_mode','Enable audio mode'),
    ('accessibility_easy_read','Enable easy read mode'),
    ('accessibility_field_help','Show contextual field help'),
    ('accessibility_inline_help','Show inline field help under fields'),

    ('audio_mode_enabled','Audio mode enabled'),
    ('audio_mode_disabled','Audio mode disabled'),
    ('audio_playing_label','Playing audio for selected field'),

    ('inline_help_enabled','Inline help enabled'),
    ('inline_help_disabled','Inline help disabled'),

    ('field_help_title','Field Help'),
    ('field_help_sidebar_title','Field guidance'),
    ('field_help_focus_hint','Click a field label to hear/read guidance.'),

    ('captcha_title','Captcha'),
    ('country_label','Country'),
    ('country_placeholder','Select country'),
    ('form_language_label','Form language'),
    ('input_language_label','Input language'),
    ('procedure_type_label','Procedure type'),
    ('procedure_grievance_option','I want to file a Grievance Report'),

    ('anonymous_label','Submit anonymously'),
    ('reporter_email_placeholder','Email'),
    ('reporter_password_placeholder','Password'),
    ('reporter_full_name_placeholder','Full name'),
    ('phone_number_placeholder','Phone number'),
    ('country_of_residence_placeholder','Country of residence'),
    ('age_placeholder','Age'),
    ('gender_placeholder','Gender'),
    ('gender_male_option','Male'),
    ('gender_female_option','Female'),

    ('reporting_for_someone_else_checkbox','I am reporting on behalf of someone else'),
    ('relationship_to_affected_person_placeholder','Relationship to affected person'),
    ('reason_for_representation_placeholder','Reason for representation'),
    ('represented_person_email_placeholder','Represented person email'),
    ('represented_person_name_placeholder','Represented person name'),
    ('represented_person_phone_placeholder','Represented person phone'),

    ('stakeholder_details_title','Stakeholder details'),

    ('incident_company_label','Reported company'),
    ('select_company_placeholder','Select company'),
    ('select_company_first_placeholder','Select company first'),
    ('add_company_button','Add company'),
    ('add_company_modal_title','Add new company'),
    ('organization_type_placeholder','Organization type'),
    ('company_name_placeholder','Company name'),
    ('company_code_placeholder','Company code'),
    ('city_placeholder','City'),
    ('address_placeholder','Address'),
    ('website_placeholder','Website'),
    ('employees_number_placeholder','Number of employees'),
    ('contact_info_placeholder','Contact information'),
    ('save_button','Save'),
    ('cancel_button','Cancel'),

    ('worksite_label','Worksite'),
    ('select_worksite_placeholder','Select worksite'),
    ('add_new_worksite_button','Add new worksite'),
    ('add_worksite_modal_title','Add new worksite'),
    ('worksite_name_placeholder','Worksite name'),
    ('worksite_employment_label','Do you (or the affected person) work at this worksite?'),
    ('incident_company_employment_label','Do you (or the affected person) work for this company?'),

    ('ngo_representation_label','NGO representation'),
    ('ngo_name_placeholder','NGO name'),
    ('ngo_contact_placeholder','NGO contact'),
    ('option_yes','Yes'),
    ('option_no','No'),
    ('option_none','None'),
    ('yes','Yes'),
    ('no','No'),

    ('alert_direct_label','Notify direct relationships'),
    ('alert_indirect_label','Notify indirect relationships'),

    ('incident_type_group_label','This report is about'),
    ('incident_type_violation_option','A occurred violation'),
    ('incident_type_risk_option','Risk'),
    ('incident_type_both_option','Both'),
    ('subject_placeholder','Subject'),
    ('description_placeholder','Description'),
    ('incident_continuing_label','Incident is continuing'),
    ('ongoing_label','Ongoing'),
    ('incident_start_date_label','Incident start date'),
    ('incident_end_date_label','Incident end date'),
    ('time_label','Time'),
    ('risk_category_placeholder','Risk category'),
    ('risk_subcategory_label','Risk sub category'),
    ('risk_subcategory_placeholder','Risk sub category'),
    ('legal_steps_taken_label','Legal steps that were taken'),
    ('legal_type_placeholder','Legal type'),
    ('suggested_remedy_label','Suggested remedy'),
    ('attachments_label','Attachments'),
    ('upload_file_placeholder','Upload file'),
    ('problem_addressed_before_label','Was this problem addressed before?'),

    ('intake_channels_title','Other intake channels'),
    ('intake_channels_subtitle','You can also submit reports through alternative channels.'),
    ('channel_email_label','Email'),
    ('channel_email_value','intake@whitebox.local'),
    ('channel_whatsapp_label','WhatsApp'),
    ('channel_whatsapp_help','Chat intake assistant'),
    ('channel_sms_label','SMS'),
    ('channel_sms_help','Text-based intake'),
    ('channel_phone_ivr_label','Phone / IVR'),
    ('channel_phone_ivr_help','Voice intake hotline'),

    ('privacy_policy_title','Privacy and policy consent'),
    ('grievance_policy_title','Grievance policy'),
    ('support_title','Support and resources'),
    ('support_email_link','Contact support'),
    ('support_guides_link','Guides'),
    ('support_legislation_link','Legislation'),
    ('support_policies_link','Policies'),

    ('review_details_label','Review details'),
    ('review_reporter_details_title','Reporter details'),
    ('review_incident_details_title','Incident details'),
    ('review_company_worksite_title','Company and worksite'),
    ('review_country_label','Country'),
    ('review_form_language_label','Form language'),
    ('review_input_language_label','Input language'),
    ('review_procedure_label','Procedure'),
    ('review_name_label','Name'),
    ('review_email_label','Email'),
    ('review_phone_label','Phone'),
    ('review_subject_label','Subject'),
    ('review_description_label','Description'),
    ('review_incident_start_label','Incident start'),
    ('review_incident_end_label','Incident end'),
    ('review_risk_category_label','Risk category'),
    ('review_sub_category_label','Risk sub category'),
    ('review_legal_steps_label','Legal steps'),
    ('review_suggested_remedy_label','Suggested remedy'),
    ('review_company_label','Company'),
    ('review_worksite_label','Worksite'),
    ('review_employment_label','Employment'),

    ('feedback_title','Feedback'),
    ('feedback_question','How was your reporting experience?'),
    ('feedback_placeholder','Write your feedback'),
    ('leave_feedback_button','Leave feedback'),

    ('next_step_button','Next step'),
    ('back_button','Back'),
    ('create_report_button','Create report'),
    ('create_report_title','Create report'),
    ('submitting_button','Submitting...'),
    ('go_to_portal_button','Go to portal'),
    ('success_thank_you_title','Thank you'),
    ('success_report_submitted','Your report has been submitted successfully.'),

    ('error_required','This field is required.'),
    ('error_country_required','Please select a country.'),
    ('error_form_language_required','Please select form language.'),
    ('error_input_language_required','Please select input language.'),
    ('error_incident_type_required','Please select incident type.'),
    ('error_subject_required','Please enter subject.'),
    ('error_description_required','Please enter description.'),
    ('error_incident_start_required','Please provide incident start date.'),
    ('error_category_required','Please select risk category.'),
    ('error_legal_steps_required','Please answer legal steps question.'),
    ('error_legal_steps_details_required','Please provide legal steps details.'),
    ('error_captcha_required','Please complete captcha.'),
    ('error_company_required','Please select company.'),
    ('error_select_company_first','Please select company first.'),
    ('error_worksite_required','Please select worksite.'),
    ('error_company_name_required','Please enter company name.'),
    ('error_org_type_required','Please select organization type.'),
    ('error_employee_count_invalid','Employee count must be a valid number.'),
    ('error_phone_invalid','Please enter a valid phone number.'),
    ('error_url_invalid','Please enter a valid URL.'),
    ('error_email_invalid','Please enter a valid email.'),
    ('error_email_required','Please enter email.'),
    ('error_password_required','Please enter password.'),
    ('error_contact_required','Please provide contact details.'),
    ('error_age_invalid','Age must be a valid number.'),
    ('error_option_required','Please select an option.'),
    ('error_relationship_required','Please provide relationship.'),
    ('error_reason_required','Please provide reason.'),
    ('error_ngo_name_required','Please provide NGO name.'),
    ('error_company_save_failed','Failed to save company.'),
    ('error_worksite_save_failed','Failed to save worksite.'),
    ('error_submit_failed','Failed to submit report.'),
    ('error_recaptcha_key_missing','reCAPTCHA site key is missing.'),

    ('field_help_captcha_title','Captcha verification'),
    ('field_help_captcha_standard','Complete the captcha to confirm this submission is created by a real user before continuing.'),
    ('field_help_captcha_easy','Please complete the captcha first.'),

    ('field_help_procedure_title','Procedure type'),
    ('field_help_procedure_standard','Choose the correct procedure. Use Grievance for rights and workplace concerns, and Whistleblowing for misconduct or fraud reporting.'),
    ('field_help_procedure_easy','Pick the process that best fits your report.'),

    ('field_help_anonymous_title','Anonymous reporting'),
    ('field_help_anonymous_standard','Enable anonymous mode if you do not want to share your identity. Keep your generated email/password to track updates later.'),
    ('field_help_anonymous_easy','Turn this on if you want to stay anonymous.'),

    ('field_help_privacy_title','Privacy and consent'),
    ('field_help_privacy_standard','Review each consent item and tick all required checkboxes. The report cannot proceed without mandatory policy acceptance.'),
    ('field_help_privacy_easy','Please read and accept all required policy checkboxes.'),

    ('field_help_country_title','Country'),
    ('field_help_country_standard','Select the country linked to this report, reporter profile, or incident location. This affects language, routing, and policy rules.'),
    ('field_help_country_easy','Choose the right country for this report.'),

    ('field_help_language_title','Language'),
    ('field_help_language_standard','Choose the language for labels and messages. If input language differs, enable the separate input option and select it too.'),
    ('field_help_language_easy','Choose the language you want to read and write in.'),

    ('field_help_email_title','Email'),
    ('field_help_email_standard','Use an email you can access. It is used to sign in, receive updates, and recover access to your report.'),
    ('field_help_email_easy','Enter your working email address.'),

    ('field_help_password_title','Password'),
    ('field_help_password_standard','Create a secure password for report access. Use at least one number and one special character if possible.'),
    ('field_help_password_easy','Create a strong password and save it.'),

    ('field_help_phone_title','Phone'),
    ('field_help_phone_standard','Add a phone number including country code if you are open to phone follow-up. Leave blank if not applicable.'),
    ('field_help_phone_easy','Add your phone number if you want call contact.'),

    ('field_help_age_title','Age'),
    ('field_help_age_standard','Provide age as a number. This helps triage vulnerable group handling and safeguarding workflows where needed.'),
    ('field_help_age_easy','Type age as a number (example: 24).'),

    ('field_help_gender_title','Gender'),
    ('field_help_gender_standard','Select the gender option that best matches the reporter or represented person. You may leave it blank if unavailable.'),
    ('field_help_gender_easy','Choose gender if you know it.'),

    ('field_help_representation_title','Representation details'),
    ('field_help_representation_standard','If you report on behalf of someone else, explain your relationship and why you are submitting this case.'),
    ('field_help_representation_easy','Tell us who you represent and why.'),

    ('field_help_company_title','Company'),
    ('field_help_company_standard','Select the reported company accurately. This determines ownership, routing, visibility, and which admins receive the case.'),
    ('field_help_company_easy','Choose the company this report is about.'),

    ('field_help_worksite_title','Worksite'),
    ('field_help_worksite_standard','Choose the specific worksite where the incident happened. If no worksite exists, add one before continuing.'),
    ('field_help_worksite_easy','Pick the location where it happened.'),

    ('field_help_ngo_title','NGO Representation'),
    ('field_help_ngo_standard','Indicate whether an NGO is involved. If yes, provide NGO name, contact, and what support or representation is given.'),
    ('field_help_ngo_easy','Tell us if an NGO is helping and add their details.'),

    ('field_help_relationship_alerts_title','Relationship Alerts'),
    ('field_help_relationship_alerts_standard','Choose if direct or indirect customer/supplier organizations should be alerted. Select specific target organizations where required.'),
    ('field_help_relationship_alerts_easy','Pick who should receive alerts.'),

    ('field_help_incident_title','Incident'),
    ('field_help_incident_standard','Describe what happened, when it started, whether it is ongoing, and any key context needed for investigation.'),
    ('field_help_incident_easy','Explain what happened and when it happened.'),

    ('field_help_subject_title','Subject'),
    ('field_help_subject_standard','Write a short, factual title that summarizes the core issue for quick triage and search.'),
    ('field_help_subject_easy','Write a short title for this report.'),

    ('field_help_description_title','Description'),
    ('field_help_description_standard','Describe the issue with concrete facts: actors involved, timeline, what evidence exists, and who is affected.'),
    ('field_help_description_easy','Explain the issue clearly and include key details.'),

    ('field_help_datetime_title','Date and time'),
    ('field_help_datetime_standard','Provide start/end dates and times as accurately as possible. If unknown, provide the closest estimate in description.'),
    ('field_help_datetime_easy','Add when the incident started and ended.'),

    ('field_help_risk_title','Risk Classification'),
    ('field_help_risk_standard','Select the risk category and sub-category that best matches the issue. This supports triage workflow and reporting analytics.'),
    ('field_help_risk_easy','Choose the risk type that best matches this case.'),

    ('field_help_legal_title','Legal Steps'),
    ('field_help_legal_standard','Indicate whether legal or formal complaint steps were already taken and summarize outcomes if available.'),
    ('field_help_legal_easy','Tell us if any legal action was already taken.'),

    ('field_help_remedy_title','Suggested Remedy'),
    ('field_help_remedy_standard','Suggest practical remediation actions that could resolve the issue, protect affected people, and prevent recurrence.'),
    ('field_help_remedy_easy','Write what should be done to fix this problem.'),

    ('field_help_attachments_title','Attachments'),
    ('field_help_attachments_standard','Upload supporting files (photos, documents, recordings) that help validate and investigate the report.'),
    ('field_help_attachments_easy','Add files that support your report.'),

    ('field_help_default_title','Field Help'),
    ('field_help_default_standard','Fill this field with accurate and complete information so the case can be processed without delay.'),
    ('field_help_default_easy','Complete this field before moving to the next step.')
),
existing as (
  select coalesce(value->'am', '{}'::jsonb) as am_obj
  from platform_settings
  where key = 'intake_i18n_copy'
),
missing as (
  select r.key, r.fallback
  from required r, existing e
  where not (e.am_obj ? r.key)
),
patch as (
  select coalesce(jsonb_object_agg(key, to_jsonb(fallback)), '{}'::jsonb) as obj
  from missing
)
update platform_settings ps
set value = jsonb_set(
  coalesce(ps.value, '{}'::jsonb),
  '{am}',
  coalesce(ps.value->'am', '{}'::jsonb) || (select obj from patch),
  true
)
where ps.key = 'intake_i18n_copy';

-- verify coverage
with required(key) as (
  values
    ('step_1_title'),('step_2_title'),('step_3_title'),('step_4_title'),('step_5_title'),
    ('step_6_title'),('step_7_title'),('step_8_title'),('step_9_title'),
    ('create_report_title'),('create_report_button'),('next_step_button')
),
am as (
  select coalesce(value->'am','{}'::jsonb) as obj
  from platform_settings
  where key='intake_i18n_copy'
)
select
  count(*) as checked_keys,
  count(*) filter (where (select obj from am) ? required.key) as present_in_am
from required;
