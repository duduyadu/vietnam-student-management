/**
 * 보고서 템플릿 데이터 추가 스크립트
 * 3가지 보고서 템플릿을 데이터베이스에 추가
 */

const db = require('./config/database');

async function fixReports() {
  console.log('🔧 보고서 템플릿 추가 시작...');
  
  try {
    // 기존 템플릿 확인
    const existing = await db('report_templates').select('*');
    console.log(`현재 템플릿 개수: ${existing.length}`);
    
    if (existing.length === 0) {
      // 3가지 보고서 템플릿 추가
      const templates = [
        {
          template_name: '종합 상담 보고서',
          template_code: 'consultation_comprehensive',
          description: '학생의 전체 상담 내역과 성장 과정을 포함한 종합 보고서',
          report_type: 'comprehensive',
          allowed_roles: JSON.stringify(['admin', 'teacher', 'branch']),
          is_active: true,
          display_order: 1
        },
        {
          template_name: '학업 진도 보고서',
          template_code: 'academic_progress',
          description: '학업 진행 상황과 TOPIK 성적을 포함한 보고서',
          report_type: 'academic',
          allowed_roles: JSON.stringify(['admin', 'teacher', 'branch']),
          is_active: true,
          display_order: 2
        },
        {
          template_name: '성적 분석 보고서',
          template_code: 'performance_analysis',
          description: 'TOPIK 모의고사 성적 분석 및 향상 계획 보고서',
          report_type: 'academic',
          allowed_roles: JSON.stringify(['admin', 'teacher', 'branch']),
          is_active: true,
          display_order: 3
        }
      ];
      
      await db('report_templates').insert(templates);
      console.log('✅ 3개의 보고서 템플릿이 추가되었습니다!');
    } else {
      console.log('ℹ️ 이미 템플릿이 존재합니다.');
      console.log('현재 템플릿 목록:');
      existing.forEach(t => {
        console.log(`  - ${t.template_name} (${t.template_code})`);
      });
    }
    
    // 테이블 구조 확인
    const columns = await db.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'report_templates'
    `);
    
    console.log('\n📊 report_templates 테이블 구조:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    
    // 테이블이 없는 경우 생성
    if (error.message.includes('does not exist')) {
      console.log('📦 report_templates 테이블 생성 중...');
      
      await db.schema.createTable('report_templates', table => {
        table.increments('template_id').primary();
        table.string('template_name').notNullable();
        table.string('template_code').unique().notNullable();
        table.text('description');
        table.string('report_type');
        table.json('allowed_roles');
        table.boolean('is_active').defaultTo(true);
        table.integer('display_order').defaultTo(0);
        table.timestamps(true, true);
      });
      
      console.log('✅ 테이블 생성 완료! 다시 실행해주세요.');
    }
  } finally {
    process.exit();
  }
}

// 실행
fixReports();