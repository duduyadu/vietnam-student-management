const db = require('../config/database');

async function checkConstraints() {
  try {
    console.log('🔍 Checking database constraints...\n');
    
    // 1. students 테이블의 체크 제약조건 확인
    const checkConstraints = await db.raw(`
      SELECT 
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS full_definition
      FROM pg_constraint con
      JOIN pg_class cls ON con.conrelid = cls.oid
      JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
      WHERE cls.relname = 'students' 
        AND con.contype = 'c'
        AND nsp.nspname = 'public'
    `);
    
    console.log('=== Students Table Check Constraints ===');
    if (checkConstraints.rows.length > 0) {
      checkConstraints.rows.forEach(constraint => {
        console.log(`\nConstraint: ${constraint.constraint_name}`);
        console.log(`Definition: ${constraint.full_definition}`);
      });
    } else {
      console.log('No check constraints found');
    }
    
    // 2. status 컬럼 정보 확인
    const columnInfo = await db.raw(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'students' 
        AND column_name = 'status'
    `);
    
    console.log('\n=== Status Column Information ===');
    console.table(columnInfo.rows);
    
    // 3. 현재 사용 중인 status 값들 확인
    const statusValues = await db('students')
      .distinct('status')
      .orderBy('status');
    
    console.log('\n=== Current Status Values in Use ===');
    console.table(statusValues);
    
    // 4. 각 status별 학생 수
    const statusCounts = await db('students')
      .select('status')
      .count('* as count')
      .groupBy('status')
      .orderBy('status');
    
    console.log('\n=== Student Count by Status ===');
    console.table(statusCounts);
    
    // 5. Foreign Key 제약조건 확인
    const foreignKeys = await db.raw(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'students'
    `);
    
    console.log('\n=== Tables Referencing Students ===');
    if (foreignKeys.rows.length > 0) {
      console.table(foreignKeys.rows);
    } else {
      console.log('No foreign key references found');
    }
    
    console.log('\n💡 SOLUTION SUGGESTIONS:');
    console.log('1. The students_status_check constraint does not allow "deleted" status');
    console.log('2. You should use one of the allowed status values like "archived" or "withdrawn"');
    console.log('3. Or modify the constraint to include "deleted" as a valid status');
    console.log('4. Foreign key constraints need CASCADE DELETE or manual deletion of related records');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkConstraints();