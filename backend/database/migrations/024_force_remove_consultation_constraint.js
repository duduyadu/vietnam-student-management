exports.up = async function(knex) {
  // Force remove any remaining consultation_type constraints
  await knex.raw(`
    DO $$ 
    BEGIN 
      ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_consultation_type_check;
    EXCEPTION 
      WHEN undefined_table THEN 
        NULL;
    END $$;
  `);
  
  console.log('✅ Forcefully removed consultation_type check constraint');
};

exports.down = async function(knex) {
  // No rollback for this migration
};