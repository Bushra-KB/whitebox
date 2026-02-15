-- Remove deprecated step 6 relationship target fields from existing intake form configs.

delete from intake_form_conditions
where target_field_key in ('directCustomerTargets', 'indirectCustomerTargets')
   or rule_json->>'field' in ('directCustomerTargets', 'indirectCustomerTargets');

delete from intake_form_translations
where field_key in ('directCustomerTargets', 'indirectCustomerTargets');

delete from intake_form_fields
where field_key in ('directCustomerTargets', 'indirectCustomerTargets');
