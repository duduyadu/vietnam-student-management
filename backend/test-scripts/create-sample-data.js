const knex = require('knex');
const config = require('./knexfile');
const db = knex(config.development);

async function createSampleData() {
  try {
    console.log('📝 샘플 데이터 생성 시작...\n');
    
    // 1. 학생 선택 (첫 번째 학생 사용)
    const students = await db('students').limit(1);
    if (students.length === 0) {
      console.log('❌ 학생이 없습니다.');
      return;
    }
    
    const student = students[0];
    const studentId = student.student_id;
    console.log(`✅ 학생 선택: ${student.name_ko} (ID: ${studentId})\n`);
    
    // 2. 기존 데이터 삭제 (깨끗한 상태에서 시작)
    console.log('🧹 기존 데이터 정리 중...');
    await db('exam_results').where('student_id', studentId).delete();
    await db('university_history').where('student_id', studentId).delete();
    await db('consultations').where('student_id', studentId).delete();
    console.log('✅ 기존 데이터 정리 완료\n');
    
    // 3. TOPIK 모의고사 8회 데이터 생성
    console.log('📊 TOPIK 모의고사 8회 데이터 생성 중...');
    const examData = [
      { 
        exam_name: 'TOPIK 1차 모의고사',
        exam_type: 'TOPIK',
        subject: 'Korean Language',
        exam_date: '2024-09-15',
        semester: '2024-2',
        score: 85,
        max_score: 300,
        percentage: 28.33,
        grade: '1급',
        detailed_scores: JSON.stringify({
          reading: 30,
          listening: 28,
          writing: 27,
          total: 85,
          level: 1
        }),
        notes: '첫 번째 모의고사. 기초 실력 확인'
      },
      { 
        exam_name: 'TOPIK 2차 모의고사',
        exam_type: 'TOPIK',
        subject: 'Korean Language',
        exam_date: '2024-10-01',
        semester: '2024-2',
        score: 92,
        max_score: 300,
        percentage: 44.00,
        grade: '3급',
        detailed_scores: JSON.stringify({
          reading: 47,
          listening: 44,
          writing: 41,
          total: 92,
          level: 3
        }),
        notes: '약간의 향상'
      },
      { 
        exam_name: 'TOPIK 3차 모의고사',
        exam_type: 'TOPIK',
        subject: 'Korean Language',
        exam_date: '2024-10-20',
        semester: '2024-2',
        score: 98,
        max_score: 300,
        percentage: 46.67,
        grade: '3급',
        detailed_scores: JSON.stringify({
          reading: 50,
          listening: 47,
          writing: 43,
          total: 98,
          level: 3
        }),
        notes: '꾸준한 향상 보임'
      },
      { 
        exam_name: 'TOPIK 4차 모의고사',
        exam_type: 'TOPIK',
        subject: 'Korean Language',
        exam_date: '2024-11-05',
        semester: '2024-2',
        score: 105,
        max_score: 300,
        percentage: 49.33,
        grade: '2급',
        detailed_scores: JSON.stringify({
          reading: 53,
          listening: 49,
          writing: 46,
          total: 105,
          level: 2
        }),
        notes: '4급 달성! 중급 수준 진입'
      },
      { 
        exam_name: 'TOPIK 5차 모의고사',
        exam_type: 'TOPIK',
        subject: 'Korean Language',
        exam_date: '2024-11-25',
        semester: '2024-2',
        score: 112,
        max_score: 300,
        percentage: 52.00,
        grade: '2급',
        detailed_scores: JSON.stringify({
          reading: 56,
          listening: 52,
          writing: 48,
          total: 112,
          level: 2
        }),
        notes: '안정적인 4급 수준'
      },
      { 
        exam_name: 'TOPIK 6차 모의고사',
        exam_type: 'TOPIK',
        subject: 'Korean Language',
        exam_date: '2024-12-16',
        semester: '2024-2',
        score: 118,
        max_score: 300,
        percentage: 54.67,
        grade: '2급',
        detailed_scores: JSON.stringify({
          reading: 58,
          listening: 55,
          writing: 51,
          total: 118,
          level: 2
        }),
        notes: '5급 도전 준비'
      },
      { 
        exam_name: 'TOPIK 7차 모의고사',
        exam_type: 'TOPIK',
        subject: 'Korean Language',
        exam_date: '2025-01-13',
        semester: '2025-1',
        score: 125,
        max_score: 300,
        percentage: 57.33,
        grade: '2급',
        detailed_scores: JSON.stringify({
          reading: 61,
          listening: 57,
          writing: 54,
          total: 125,
          level: 2
        }),
        notes: '5급 달성! 상급 수준'
      },
      { 
        exam_name: 'TOPIK 8차 모의고사',
        exam_type: 'TOPIK',
        subject: 'Korean Language',
        exam_date: '2025-02-10',
        semester: '2025-1',
        score: 130,
        max_score: 300,
        percentage: 60.00,
        grade: '2급',
        detailed_scores: JSON.stringify({
          reading: 64,
          listening: 60,
          writing: 56,
          total: 130,
          level: 2
        }),
        notes: '안정적인 5급! 목표 수준 도달'
      }
    ];
    
    for (const exam of examData) {
      await db('exam_results').insert({
        ...exam,
        student_id: studentId,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    console.log('✅ 모의고사 8회 데이터 생성 완료\n');
    
    // 4. 장래 희망학과 변경 이력은 상담 기록에 포함
    console.log('🎓 장래 희망학과 변경 이력은 상담 기록으로 대체\n');
    
    // 5. 현재 학생 정보는 그대로 유지
    console.log('✅ 학생 정보 유지\n');
    
    // 6. 상담 기록 추가 (희망학과 변경과 연계)
    console.log('💬 상담 기록 생성 중...');
    const consultations = [
      {
        student_id: studentId,
        consultation_date: '2024-09-01',
        consultation_type: 'in_person',
        notes: '[진로 상담] 학생이 한국 유학에 대한 목표를 설정. 경영학 분야에 관심이 있으며, 서울대학교 경영학과를 목표로 학습 계획 수립. TOPIK 점수 향상 필요, 한국어 회화 능력 개선 필요. 다음 목표: TOPIK 4급 달성, 경영학 기초 서적 읽기',
        content_ko: '[초기 진로 설정 상담 - 서울대 경영학과 목표] 학생이 한국 유학에 대한 목표를 설정. 경영학 분야에 관심이 있으며, 서울대학교 경영학과를 목표로 학습 계획 수립. 상담사: 김상담',
        action_items: 'TOPIK 4급 달성, 경영학 기초 서적 읽기, 한국어 회화 연습',
        status: 'completed',
        created_by: 1,
        teacher_id: 1,
        next_consultation_date: '2024-10-01',
        created_at: new Date('2024-09-01'),
        updated_at: new Date('2024-09-01')
      },
      {
        student_id: studentId,
        consultation_date: '2024-11-15',
        consultation_type: 'video',
        notes: '[진로 변경 상담] TOPIK 성적이 꾸준히 향상되고 있음. 학생이 프로그래밍에 흥미를 느끼고 IT 분야로 진로 변경 희망. 연세대 컴퓨터공학과를 새로운 목표로 설정. 수학 기초 학습 필요, 프로그래밍 기초 공부 시작',
        content_ko: '[IT 분야로 진로 전환 상담 - 연세대 컴퓨터공학과 목표] TOPIK 성적이 꾸준히 향상되고 있음. 학생이 프로그래밍에 흥미를 느끼고 IT 분야로 진로 변경 희망. 연세대 컴퓨터공학과를 새로운 목표로 설정. 상담사: 이상담',
        action_items: 'TOPIK 5급 도전, Python 기초 학습, 수학 기초 강화',
        status: 'completed',
        created_by: 2,
        teacher_id: 2,
        next_consultation_date: '2024-12-15',
        created_at: new Date('2024-11-15'),
        updated_at: new Date('2024-11-15')
      },
      {
        student_id: studentId,
        consultation_date: '2025-01-20',
        consultation_type: 'in_person',
        notes: '[최종 진로 확정 상담] TOPIK 5급 달성이 가시화됨. 학생의 관심사를 종합적으로 고려하여 성균관대 글로벌경영학과로 최종 목표 확정. 국제 비즈니스와 IT를 융합한 진로 계획 수립. 학생의 성적이 꾸준히 향상되고 있으며, 목표 의식이 뚜렷함. 성균관대 글로벌경영학과 진학 가능성이 높음',
        content_ko: '[글로벌 경영학과로 최종 목표 설정 - 성균관대 글로벌경영학과] TOPIK 5급 달성이 가시화됨. 학생의 관심사를 종합적으로 고려하여 성균관대 글로벌경영학과로 최종 목표 확정. 국제 비즈니스와 IT를 융합한 진로 계획 수립. 상담사: 박상담',
        action_items: 'TOPIK 5급 확실한 달성, 대학 입학 서류 준비, 영어 능력 향상',
        status: 'completed',
        created_by: 3,
        teacher_id: 3,
        next_consultation_date: '2025-02-20',
        created_at: new Date('2025-01-20'),
        updated_at: new Date('2025-01-20')
      }
    ];
    
    for (const consultation of consultations) {
      await db('consultations').insert(consultation);
    }
    console.log('✅ 상담 기록 3건 생성 완료\n');
    
    // 7. 학업 데이터 업데이트
    console.log('📚 학업 데이터 업데이트 중...');
    
    // 기존 데이터 확인
    const existingAcademic = await db('student_academic_data')
      .where('student_id', studentId)
      .first();
    
    if (existingAcademic) {
      await db('student_academic_data')
        .where('student_id', studentId)
        .update({
          attendance_rate: 95,
          participation_grade: 'A',
          vocabulary_known: 3500,
          strength_areas: '한국어 읽기, 듣기, 논리적 사고',
          weakness_areas: '쓰기 속도, 고급 어휘',
          learning_strategy: 'TOPIK 기출문제 반복 학습, 비즈니스 한국어 집중 학습',
          updated_at: new Date()
        });
    } else {
      await db('student_academic_data').insert({
        student_id: studentId,
        attendance_rate: 95,
        participation_grade: 'A',
        vocabulary_known: 3500,
        strength_areas: '한국어 읽기, 듣기, 논리적 사고',
        weakness_areas: '쓰기 속도, 고급 어휘',
        learning_strategy: 'TOPIK 기출문제 반복 학습, 비즈니스 한국어 집중 학습',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    console.log('✅ 학업 데이터 업데이트 완료\n');
    
    console.log('🎉 모든 샘플 데이터 생성 완료!');
    console.log('\n📊 생성된 데이터 요약:');
    console.log('- TOPIK 모의고사: 8회 (85점 → 130점, 1급 → 2급)');
    console.log('- 상담 기록: 3건 (희망학과 변경 포함)');
    console.log('  1) 서울대 경영학과 목표 설정');
    console.log('  2) 연세대 컴퓨터공학과로 변경');
    console.log('  3) 성균관대 글로벌경영학과로 최종 확정');
    console.log(`\n학생 ID ${studentId}번으로 PDF를 생성하면 이 데이터가 포함됩니다.`);
    
  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
  } finally {
    await db.destroy();
  }
}

createSampleData();