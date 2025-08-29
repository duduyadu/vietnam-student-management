exports.up = async function(knex) {
  // Drop view if exists
  await knex.raw('DROP VIEW IF EXISTS v_consultations_full');
  
  // Create view
  return knex.raw(`
    CREATE VIEW v_consultations_full AS
    SELECT 
      c.*,
      s.student_code,
      s.name_ko as student_name_ko,
      s.name_vi as student_name_vi,
      t.full_name as teacher_name,
      ct.type_name_ko,
      ct.type_name_vi,
      ct.category as type_category
    FROM consultations c
    LEFT JOIN students s ON c.student_id = s.student_id
    LEFT JOIN users t ON c.teacher_id = t.user_id
    LEFT JOIN consultation_types ct ON c.consultation_type = ct.type_code
  `);
};

exports.down = function(knex) {
  return knex.raw('DROP VIEW IF EXISTS v_consultations_full');
};