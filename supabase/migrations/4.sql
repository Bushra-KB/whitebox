update platform_settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{am}',
  coalesce(value->'am', '{}'::jsonb) || '{
    "audio_mode_enabled":"የድምጽ ሁነታ፡ ክፍት",
    "audio_mode_disabled":"የድምጽ ሁነታ፡ ዝግ",
    "inline_help_enabled":"የመስክ እገዛ፡ ክፍት",
    "inline_help_disabled":"የመስክ እገዛ፡ ዝግ",
    "field_help_title":"የመስክ እገዛ",
    "field_help_sidebar_title":"የመስክ እገዛ",
    "field_help_focus_hint":"መስክ ላይ በመጫን ወይም በመምረጥ እገዛ ይመልከቱ",
    "field_help_default_title":"የመስክ እገዛ",
    "field_help_default_standard":"ይህን መስክ በትክክል እና በሙሉ ይሙሉ ፣ ጉዳዩ በፍጥነት እንዲቀጥል።",
    "field_help_default_easy":"ወደ ቀጣዩ ደረጃ ከመሄድዎ በፊት ይህን መስክ ይሙሉ።",

    "step5_title":"ቀጥተኛ እና ቀጥተኛ ያልሆኑ ደንበኞች",
    "step5_help":"ቀጥተኛ እና ቀጥተኛ ያልሆኑ ደንበኞች እንዲጠነቀቁ እንደሚፈልጉ ይምረጡ። አዎ ከሆነ አንድ ወይም ከዚያ በላይ የታለሙ ድርጅቶችን ይምረጡ።",
    "alert_direct_label":"ቀጥተኛ ደንበኞችን እንዲጠነቀቁ ይፈልጋሉ?",
    "alert_indirect_label":"ቀጥተኛ ያልሆኑ ደንበኞችን እንዲጠነቀቁ ይፈልጋሉ?",
    "no_direct_relationship_targets":"ለዚህ ድርጅት ቀጥተኛ የግንኙነት ተቀባዮች አልተገኙም።",
    "no_indirect_relationship_targets":"ለዚህ ድርጅት ቀጥተኛ ያልሆኑ የግንኙነት ተቀባዮች አልተገኙም።",

    "yes":"አዎ",
    "no":"አይ",
    "back_button":"ተመለስ",
    "next_step_button":"ቀጣይ ደረጃ",

    "incident_type_group_label":"ይህ ሪፖርት ስለ",
    "incident_type_violation_option":"የተፈጠረ ጥሰት",
    "incident_type_risk_option":"አደጋ",
    "incident_type_both_option":"ሁለቱም",
    "subject_placeholder":"ርዕስ",
    "description_placeholder":"መግለጫ",
    "incident_start_date_label":"የክስተት መጀመሪያ ቀን",
    "incident_end_date_label":"የክስተት መጨረሻ ቀን",
    "time_label":"ሰዓት",
    "incident_continuing_label":"ክስተቱ እየቀጠለ ነው",

    "select_company_first_placeholder":"መጀመሪያ ኩባንያ ይምረጡ",
    "select_company_placeholder":"ኩባንያ ይምረጡ",
    "select_worksite_placeholder":"የስራ ቦታ ይምረጡ",
    "add_new_worksite_button":"አዲስ የስራ ቦታ ጨምር",

    "intake_channels_title":"የመግቢያ ቻናሎች",
    "intake_channels_subtitle":"ከሌሎች ቻናሎች ሪፖርት ያቅርቡ",
    "channel_whatsapp_label":"WhatsApp",
    "channel_whatsapp_help":"የመልዕክት መግቢያ ቻናል",
    "channel_sms_label":"SMS",
    "channel_sms_help":"አጭር መልዕክት መግቢያ",
    "channel_phone_ivr_label":"ስልክ / IVR",
    "channel_phone_ivr_help":"የድምጽ መግቢያ ቻናል",
    "channel_email_label":"ኢሜይል",
    "channel_email_value":"intake@whitebox.local",

    "error_select_company_first":"መጀመሪያ ኩባንያ ይምረጡ።",
    "error_required":"ይህ መስክ አስፈላጊ ነው።",
    "error_subject_required":"ርዕስ አስፈላጊ ነው።",
    "error_description_required":"መግለጫ አስፈላጊ ነው።",
    "error_submit_failed":"ሪፖርት መላክ አልተሳካም። እባክዎ እንደገና ይሞክሩ።",
    "success_report_submitted":"ሪፖርትዎ በተሳካ ሁኔታ ተልኳል።"
  }'::jsonb,
  true
)
where key = 'intake_i18n_copy';
