const db = require('../config/database');

async function createTestData() {
  try {
    console.log('📝 테스트 데이터 생성 시작...');

    // 먼저 첫 번째 학생 ID 찾기
    const students = await db('students').select('student_id').limit(3);
    
    if (students.length === 0) {
      console.error('❌ 학생 데이터가 없습니다. 먼저 학생을 등록해주세요.');
      return;
    }

    for (const student of students) {
      const studentId = student.student_id;
      console.log(`👨‍🎓 학생 ID ${studentId}에 대한 테스트 데이터 생성 중...`);

      // 1. 시험 성적 데이터 추가
      const examResults = [
        {
          student_id: studentId,
          exam_name: '2024년 1학기 중간고사',
          exam_type: 'midterm',
          subject: '한국어',
          exam_date: '2024-04-15',
          semester: '2024-1',
          score: 85,
          max_score: 100,
          percentage: 85,
          grade: 'B+',
          notes: '문법 부분 우수, 어휘력 향상 필요',
          created_by: 1
        },
        {
          student_id: studentId,
          exam_name: '2024년 1학기 기말고사',
          exam_type: 'final',
          subject: '한국어',
          exam_date: '2024-06-20',
          semester: '2024-1',
          score: 92,
          max_score: 100,
          percentage: 92,
          grade: 'A',
          notes: '전반적으로 우수한 성과',
          created_by: 1
        },
        {
          student_id: studentId,
          exam_name: 'TOPIK 모의고사',
          exam_type: 'other',
          subject: '한국어능력시험',
          exam_date: '2024-05-10',
          semester: '2024-1',
          score: 178,
          max_score: 300,
          percentage: 59.3,
          grade: '3급',
          notes: 'TOPIK 3급 수준',
          created_by: 1
        }
      ];

      // 시험 성적이 이미 있는지 확인
      const existingExams = await db('exam_results')
        .where('student_id', studentId)
        .count('* as count');
      
      if (existingExams[0].count === 0) {
        await db('exam_results').insert(examResults);
        console.log(`  ✅ 시험 성적 ${examResults.length}개 추가`);
      } else {
        console.log(`  ℹ️ 시험 성적이 이미 존재합니다`);
      }

      // 2. 학습 진도 데이터 추가
      const learningProgress = [
        {
          student_id: studentId,
          subject: '한국어 초급',
          record_date: '2024-03-01',
          completion_percentage: 100,
          attendance_rate: 95,
          overall_performance: 'excellent',
          teacher_comments: '매우 성실하게 수업에 참여하고 있으며, 학습 태도가 우수합니다.',
          homework_completion: 98,
          class_participation: 95,
          teacher_id: 1
        },
        {
          student_id: studentId,
          subject: '한국어 중급',
          record_date: '2024-06-01',
          completion_percentage: 65,
          attendance_rate: 92,
          overall_performance: 'good',
          teacher_comments: '중급 과정에서도 꾸준히 성장하고 있습니다. 말하기 실력이 특히 향상되었습니다.',
          homework_completion: 88,
          class_participation: 90,
          teacher_id: 1
        },
        {
          student_id: studentId,
          subject: '한국문화의 이해',
          record_date: '2024-05-15',
          completion_percentage: 80,
          attendance_rate: 100,
          overall_performance: 'excellent',
          teacher_comments: '한국 문화에 대한 관심이 높고, 적극적으로 참여합니다.',
          homework_completion: 100,
          class_participation: 100,
          teacher_id: 1
        }
      ];

      // 학습 진도가 이미 있는지 확인
      const existingProgress = await db('learning_progress')
        .where('student_id', studentId)
        .count('* as count');
      
      if (existingProgress[0].count === 0) {
        await db('learning_progress').insert(learningProgress);
        console.log(`  ✅ 학습 진도 ${learningProgress.length}개 추가`);
      } else {
        console.log(`  ℹ️ 학습 진도가 이미 존재합니다`);
      }

      // 3. 학업 목표 데이터 추가 (시계열)
      const academicGoals = [
        {
          student_id: studentId,
          goal_date: '2024-01-15',
          preferred_major: '경영학과',
          preferred_university: '서울대학교',
          career_goal: '국제 비즈니스 전문가',
          notes: '처음에는 경영학에 관심을 보임',
          created_by: 1
        },
        {
          student_id: studentId,
          goal_date: '2024-04-20',
          preferred_major: '컴퓨터공학과',
          preferred_university: '카이스트',
          career_goal: '소프트웨어 개발자',
          notes: '프로그래밍에 흥미를 느끼고 진로 변경 고려',
          created_by: 1
        },
        {
          student_id: studentId,
          goal_date: '2024-06-30',
          preferred_major: '컴퓨터공학과',
          preferred_university: '연세대학교',
          career_goal: 'AI 엔지니어',
          notes: '컴퓨터공학으로 확정, AI 분야에 특별한 관심',
          created_by: 1
        }
      ];

      // 학업 목표가 이미 있는지 확인
      const existingGoals = await db('academic_goals')
        .where('student_id', studentId)
        .count('* as count');
      
      if (existingGoals[0].count === 0) {
        await db('academic_goals').insert(academicGoals);
        console.log(`  ✅ 학업 목표 ${academicGoals.length}개 추가`);
      } else {
        console.log(`  ℹ️ 학업 목표가 이미 존재합니다`);
      }
    }

    console.log('\n✅ 테스트 데이터 생성 완료!');
    console.log('📌 이제 보고서 데이터 관리 페이지에서 데이터를 확인하고 수정할 수 있습니다.');
    console.log('📌 보고서 생성 페이지에서 PDF 보고서를 생성해보세요.');
    
  } catch (error) {
    console.error('❌ 테스트 데이터 생성 중 오류:', error);
    throw error;
  }
}

// 실행
if (require.main === module) {
  createTestData()
    .then(() => {
      console.log('✅ 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 실패:', error);
      process.exit(1);
    });
}

module.exports = createTestData;