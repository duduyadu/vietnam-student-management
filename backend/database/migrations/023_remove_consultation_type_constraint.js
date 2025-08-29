exports.up = async function(knex) {
  // Drop the old check constraint
  await knex.raw('ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_consultation_type_check');
  
  console.log('✅ Removed consultation_type check constraint');
};

exports.down = async function(knex) {
  // Recreate the old constraint if needed (rollback)
  await knex.raw(`
    ALTER TABLE consultations 
    ADD CONSTRAINT consultations_consultation_type_check 
    CHECK (consultation_type IN ('phone', 'video', 'in_person', 'email'))
  `);
};