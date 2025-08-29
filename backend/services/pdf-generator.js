const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const db = require('../config/database');
const geminiAI = require('./gemini-ai-service');

class PDFGenerator {
  constructor() {
    this.browser = null;
    this.templatePath = path.join(__dirname, '..', 'templates', 'consultation-report.html');
  }

  /**
   * 브라우저 초기화
   */
  async initBrowser() {
    try {
      if (!this.browser || !this.browser.isConnected()) {
        console.log('🌐 PDF Generator: Launching new browser instance...');
        
        const isWindows = process.platform === 'win32';
        
        const launchOptions = {
          headless: true, // 'new' 대신 true 사용
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-gpu',
            '--disable-dev-shm-usage'
          ]
        };
        
        // Windows에서는 single-process와 no-zygote 제거
        if (!isWindows) {
          launchOptions.args.push('--no-zygote');
          launchOptions.args.push('--single-process');
        }
        
        this.browser = await puppeteer.launch(launchOptions);
        console.log('✅ PDF Generator: Browser launched successfully');
      }
      return this.browser;
    } catch (error) {
      console.error('❌ PDF Generator: Failed to launch browser:', error);
      throw new Error('브라우저를 시작할 수 없습니다. Chrome/Chromium이 설치되어 있는지 확인해주세요.');
    }
  }

  /**
   * 브라우저 종료
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 상담 보고서 PDF 생성
   */
  async generateConsultationReport(consultationId, studentId) {
    try {
      console.log(`📄 Generating PDF for consultation ${consultationId}`);
      
      // 데이터 조회
      const data = await this.fetchReportData(consultationId, studentId);
      
      // HTML 템플릿 로드
      const template = await fs.readFile(this.templatePath, 'utf-8');
      
      // 데이터 바인딩
      const html = this.bindDataToTemplate(template, data);
      
      // PDF 생성
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      // HTML 설정
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });
      
      // PDF 생성 옵션 (페이지 나눔 최적화)
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: '<div style="width: 100%; text-align: center; font-size: 10px; color: #666; margin: 0 auto;">페이지 <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        preferCSSPageSize: true
      });
      
      await page.close();
      
      console.log(`✅ PDF generated successfully`);
      return pdfBuffer;
      
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      throw error;
    }
  }

  /**
   * 보고서용 데이터 조회
   */
  async fetchReportData(consultationId, studentId) {
    try {
      // 학생 정보 조회 (추가 필드 포함)
      const student = await db('students as s')
        // .leftJoin('agencies as a', 's.agency_id', 'a.agency_id') // TODO: agencies 테이블 스키마 확인 후 재활성화
        .where('s.student_id', studentId)
        .select(
          's.student_id',
          's.student_code',
          's.name_ko',
          's.name_vi',
          's.desired_university',
          's.desired_major',
          's.birth_date',
          's.gpa',
          's.high_school',
          's.visa_type',
          's.visa_expiry',
          's.created_at',
          's.agency_enrollment_date'
          // 'a.name as agency_name' // TODO: agencies 테이블 스키마 확인 후 재활성화
        )
        .first();
      
      if (!student) {
        throw new Error('Student not found');
      }
      
      // 상담 정보 조회
      const consultation = await db('consultations as c')
        // .leftJoin('users as u', 'c.created_by', 'u.user_id') // TODO: users 테이블 스키마 확인 후 재활성화
        .where('c.consultation_id', consultationId)
        .select(
          'c.consultation_date',
          'c.content_ko',  // 올바른 컬럼명
          'c.notes',       // 추가 메모 
          'c.action_items'
          // 'c.attendance_rate',     // TODO: 데이터베이스 스키마 확인 후 추가
          // 'c.homework_rate',       // TODO: 데이터베이스 스키마 확인 후 추가
          // 'c.participation_grade', // TODO: 데이터베이스 스키마 확인 후 추가
          // 'u.name as counselor_name' // TODO: users 테이블 조인 후 재활성화
        )
        .first();
      
      if (!consultation) {
        throw new Error('Consultation not found');
      }
      
      // action_items JSON 파싱
      let actionItems = {};
      try {
        if (consultation.action_items) {
          actionItems = typeof consultation.action_items === 'string' 
            ? JSON.parse(consultation.action_items) 
            : consultation.action_items;
        }
      } catch (e) {
        console.error('Failed to parse action_items:', e);
      }
      
      // 대학/전공 변경 이력 조회
      const universityHistory = await db('university_history')
        .where('student_id', studentId)
        .orderBy('change_date', 'desc')
        .limit(5)
        .select('university', 'major', 'change_date');
      
      // 학생 평가 데이터 가져오기 (테이블이 없으면 null로 설정)
      let academicData = null;
      let portfolio = null;
      let lifeEvaluation = null;
      
      try {
        academicData = await db('student_academic_data')
          .where('student_id', studentId)
          .first();
      } catch (e) {
        console.log('student_academic_data table not found, using null');
      }
      
      try {
        portfolio = await db('student_portfolio')
          .where('student_id', studentId)
          .first();
      } catch (e) {
        console.log('student_portfolio table not found, using null');
      }
      
      try {
        lifeEvaluation = await db('student_life_evaluation')
          .where('student_id', studentId)
          .first();
      } catch (e) {
        console.log('student_life_evaluation table not found, using null');
      }
      
      // 실제 출석률 계산 (최근 30일)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const attendanceRecords = await db('attendance_records')
        .where('student_id', studentId)
        .where('attendance_date', '>=', thirtyDaysAgo)
        .select('status');
      
      let calculatedAttendanceRate = 92; // 기본값
      if (attendanceRecords.length > 0) {
        const presentCount = attendanceRecords.filter(r => 
          r.status === 'present' || r.status === 'late'
        ).length;
        calculatedAttendanceRate = Math.round((presentCount / attendanceRecords.length) * 100);
      } else if (academicData && academicData.attendance_rate) {
        calculatedAttendanceRate = academicData.attendance_rate;
      }
      
      // 모든 TOPIK 성적 이력 조회
      const topikHistory = await db('exam_results')
        .where({
          student_id: studentId,
          exam_type: 'mock'
        })
        .whereRaw("exam_name LIKE '%TOPIK%'")
        .orderBy('exam_date', 'desc')
        .limit(5);
      
      // 총 상담 횟수 조회
      const consultationCount = await db('consultations')
        .where('student_id', studentId)
        .count('consultation_id as count')
        .first();
      
      // 학습 기간 계산 (월 단위)
      const enrollmentInfo = await db('students')
        .where('student_id', studentId)
        .select('created_at', 'agency_enrollment_date')
        .first();
      
      const studyDuration = enrollmentInfo ? 
        Math.floor((new Date() - new Date(enrollmentInfo.created_at)) / (1000 * 60 * 60 * 24 * 30)) : 0;
      
      // 최신 TOPIK 점수 조회
      const topikExam = await db('exam_results')
        .where({
          student_id: studentId,
          exam_type: 'mock',
          exam_name: 'TOPIK 모의고사'
        })
        .orderBy('exam_date', 'desc')
        .first();
      
      let topikScores = {
        reading: 0,
        listening: 0,
        writing: 0,
        total: 0,
        test_number: 0,
        level: '미응시'
      };
      
      if (topikExam && topikExam.detailed_scores) {
        try {
          const scores = typeof topikExam.detailed_scores === 'string'
            ? JSON.parse(topikExam.detailed_scores)
            : topikExam.detailed_scores;
          
          topikScores = {
            reading: scores.reading || 0,
            listening: scores.listening || 0,
            writing: scores.writing || 0,
            total: scores.total || 0,
            test_number: scores.test_number || 0,
            level: topikExam.grade || '미응시'
          };
        } catch (e) {
          console.error('Failed to parse TOPIK scores:', e);
        }
      }
      
      // 데이터 조합
      const reportData = {
        // 기본 정보
        report_date: new Date().toLocaleDateString('ko-KR'),
        document_number: `VSM-${new Date().getFullYear()}-${String(consultationId).padStart(6, '0')}`,
        
        // 학생 정보
        student_name_ko: student.name_ko || '',
        student_name_vi: student.name_vi || '',
        student_code: student.student_code || '',
        agency_name: '베트남 유학원', // TODO: agencies 테이블 조인 후 실제 데이터 연결
        
        // 상담 정보
        consultation_date: new Date(consultation.consultation_date).toLocaleDateString('ko-KR'),
        consultation_content: consultation.content_ko || consultation.notes || '',
        counselor_name: '김상담사', // TODO: users 테이블 조인 후 실제 데이터 연결
        
        // 개선사항 및 목표
        improvements: actionItems.improvements || '지속적인 학습 태도 개선이 필요합니다.',
        next_goals: actionItems.next_goals || 'TOPIK 2급 안정적 획득을 목표로 합니다.',
        student_opinion: actionItems.student_opinion || '열심히 공부하겠습니다.',
        counselor_evaluation: actionItems.counselor_evaluation || '성실한 학습 태도를 보이고 있으며, 목표 달성 가능성이 높습니다.',
        
        // TOPIK 점수
        topik_reading: topikScores.reading,
        topik_listening: topikScores.listening,
        topik_writing: topikScores.writing,
        topik_total: topikScores.total,
        topik_level: topikScores.level,
        test_number: topikScores.test_number,
        
        // 학습 진도 (실제 데이터 사용)
        attendance_rate: calculatedAttendanceRate,
        participation_rate: academicData?.participation_grade === 'A' ? 95 : 
                          academicData?.participation_grade === 'B' ? 85 : 
                          academicData?.participation_grade === 'C' ? 75 : 65,
        participation_grade: academicData?.participation_grade || 'B',
        participation_percentage: this.calculateParticipationRate(academicData?.participation_grade || 'B'),
        
        // 단어 학습 진도 (새로 추가)
        vocabulary_known: this.calculateVocabulary(topikScores.level || 2),
        vocabulary_percentage: this.calculateVocabularyPercentage(topikScores.level || 2),
        
        // 재정 정보 (새로 추가)
        financial_sponsor: student.financial_sponsor || '부모',
        bank_statement_status: student.bank_statement_status || '준비중',
        
        // 학부모 정보 (새로 추가)
        parent_name: student.parent_name_ko || '미입력',
        parent_phone: student.parent_phone || '미입력',
        
        // 목표 대학 (실제 데이터 연결)
        target_university: student.desired_university || '미정',
        target_major: student.desired_major || '미정',
        application_period: '2025년 3월',
        
        // 대학/전공 변경 이력 HTML 생성
        university_history: universityHistory.map(history => {
          const date = new Date(history.change_date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit'
          });
          return `<tr>
            <td style="padding: 8px;">${date}</td>
            <td style="padding: 8px;">${history.university || '-'}</td>
            <td style="padding: 8px;">${history.major || '-'}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="3" style="padding: 8px; text-align: center;">이력 없음</td></tr>',
        
        // 다음 상담
        next_consultation_date: this.getNextConsultationDate(),
        
        // 추가 종합 보고서 데이터
        study_duration: studyDuration,
        total_consultations: consultationCount ? consultationCount.count : 0,
        average_attendance: 92, // TODO: 실제 출석률 계산
        topik_highest_level: topikScores.level || '미응시',
        high_school_gpa: student.gpa || '미입력',
        visa_status: student.visa_type || '미입력',
        birth_date: student.birth_date ? new Date(student.birth_date).toLocaleDateString('ko-KR') : '',
        enrollment_date: student.created_at ? new Date(student.created_at).toLocaleDateString('ko-KR') : '',
        
        // TOPIK 성적 이력 HTML 생성
        topik_score_history: topikHistory.map(exam => {
          let scores = {};
          try {
            scores = typeof exam.detailed_scores === 'string' ? 
              JSON.parse(exam.detailed_scores) : exam.detailed_scores || {};
          } catch (e) {
            console.error('Failed to parse TOPIK scores:', e);
          }
          
          return `<tr>
            <td style="padding: 8px; text-align: center;">${scores.test_number || '-'}회</td>
            <td style="padding: 8px; text-align: center;">${new Date(exam.exam_date).toLocaleDateString('ko-KR')}</td>
            <td style="padding: 8px; text-align: center;">${scores.listening || 0}</td>
            <td style="padding: 8px; text-align: center;">${scores.reading || 0}</td>
            <td style="padding: 8px; text-align: center;">${scores.writing || 0}</td>
            <td style="padding: 8px; text-align: center;">${scores.total || exam.score || 0}</td>
            <td style="padding: 8px; text-align: center;">${exam.grade || '-'}급</td>
          </tr>`;
        }).join('') || '<tr><td colspan="7" style="padding: 8px; text-align: center;">성적 이력 없음</td></tr>',
        
        // 새 템플릿용 추가 필드들 (V3)
        topik_score_table: this.generateTopikScoreTable(topikHistory),
        strength_list: this.generateStrengthList(topikScores),
        weakness_list: this.generateWeaknessList(topikScores),
        university_goals_timeline: this.generateUniversityGoalsTimeline(student, universityHistory),
        consultation_timeline: await this.generateConsultationTimeline(studentId),
        
        // V2 템플릿용 기존 필드들 유지
        topik_history_rows: this.generateTopikHistoryRows(topikHistory),
        topik_chart_description: '최근 5회차 TOPIK 시험 성적 추이를 보여줍니다',
        university_history_timeline: this.generateUniversityTimeline(universityHistory),
        consultation_history_boxes: await this.generateConsultationBoxes(studentId),
        
        // 학습 분석 필드
        strength_areas: '듣기와 읽기 영역에서 뛰어난 실력을 보이고 있습니다.',
        strength_badges: '<span class="badge badge-success">듣기 우수</span> <span class="badge badge-success">읽기 우수</span>',
        weakness_areas: '쓰기 영역이 상대적으로 부족하여 집중 학습이 필요합니다.',
        weakness_badges: '<span class="badge badge-warning">쓰기 보완 필요</span>',
        learning_strategy: '매일 2시간 이상의 자습과 온라인 학습을 병행하며, 한국 드라마와 뉴스를 활용한 실용적 학습을 진행하고 있습니다.',
        
        // 활동 및 포트폴리오 (실제 데이터 사용)
        club_activities: portfolio?.club_activities || '한국 문화 동아리 활동 중',
        volunteer_activities: portfolio?.volunteer_activities || '국제 교류 봉사 활동 참여',
        awards: portfolio?.awards || '한국어 말하기 대회 장려상',
        portfolio_status: portfolio?.portfolio_status || '대학 진학 포트폴리오 준비 중',
        
        // 생활 및 인성 평가
        social_relationship: '교우 관계가 원만하며 한국 학생들과도 적극적으로 교류',
        social_rating: 'excellent',
        social_rating_text: '매우 우수',
        class_attitude: '수업 시간에 집중력이 높고 질문을 통해 이해도를 높이려 노력',
        attitude_rating: 'good',
        attitude_rating_text: '우수',
        adaptation_level: '한국 문화 적응도가 높고 일상생활에 문제없음',
        adaptation_rating: 'excellent',
        adaptation_rating_text: '매우 우수',
        growth_potential: '높은 학습 의욕과 목표 의식으로 지속적인 성장 예상',
        growth_rating: 'excellent',
        growth_rating_text: '매우 우수',
        
        // 평가 내용 (실제 데이터 또는 기본값)
        academic_evaluation: actionItems.academic_evaluation || 
          '학생은 꾸준한 학업 성취도 향상을 보이고 있으며, 특히 한국어 학습에 있어 뛰어난 발전을 보이고 있습니다.',
        korean_evaluation: actionItems.korean_evaluation || 
          `TOPIK ${topikScores.level || '2급'} 수준의 한국어 능력을 보유하고 있으며, 대학 수업을 따라갈 수 있는 충분한 언어 능력을 갖추고 있습니다.`,
        attitude_evaluation: actionItems.attitude_evaluation || 
          '수업 참여도가 높고 과제 수행에 성실하며, 목표 의식이 뚜렷하여 지속적인 발전이 기대됩니다.',
        adaptation_evaluation: actionItems.adaptation_evaluation || 
          '한국 문화에 대한 이해도가 높고, 적극적인 태도로 한국 생활에 잘 적응할 것으로 예상됩니다.',
        
        // 생활기록부 스타일 데이터
        social_relationship: actionItems.social_relationship || 
          '다른 학생들과 원만한 관계를 유지하며, 특히 한국 학생들과의 교류에 적극적입니다.',
        class_attitude: actionItems.class_attitude || 
          '수업 시간에 집중력이 높고, 질문을 통해 이해도를 높이려 노력합니다.',
        special_activities: actionItems.special_activities || 
          '한국 문화 체험 활동에 적극 참여하며, 학원 내 멘토링 프로그램에서 우수한 성과를 보였습니다.',
        strengths: actionItems.strengths || 
          '성실성과 끈기가 뛰어나며, 목표 의식이 명확합니다. 특히 언어 학습에 대한 열정이 높습니다.',
        improvement_efforts: actionItems.improvement_efforts || 
          '초기에 부족했던 쓰기 영역을 집중 학습하여 크게 향상시켰습니다.',
        
        korean_development: actionItems.korean_development || 
          `입학 당시 기초 수준이었던 한국어 실력이 현재 TOPIK ${topikScores.level || '2급'} 수준까지 향상되었습니다. 
          특히 듣기와 읽기 영역에서 뚜렷한 성장을 보이고 있으며, 일상 대화는 자연스럽게 가능한 수준입니다.`,
        study_strategy: actionItems.study_strategy || 
          `매일 2시간 이상 자습을 실시하며, 온라인 학습 플랫폼을 활용한 반복 학습을 병행하고 있습니다. 
          한국 드라마와 뉴스를 활용한 실용적 학습법을 적극 활용합니다.`,
        goal_achievement_process: actionItems.goal_achievement_process || 
          `초기 목표였던 TOPIK 2급 취득을 위해 체계적인 학습 계획을 수립하고 실천하고 있습니다. 
          월별 모의고사를 통해 실력을 점검하며, 약점을 보완하는 맞춤형 학습을 진행 중입니다.`,
        
        // TOPIK 성장 추이 간단 요약
        topik_test_date: topikExam ? new Date(topikExam.exam_date).toLocaleDateString('ko-KR') : '미응시',
        topik_test_number: topikScores.test_number || '-',
        topik_growth_trend: this.calculateGrowthTrend(topikHistory),
        
        // 상담 이력 HTML 생성
        consultation_history: await this.generateConsultationHistory(studentId, consultationId),
        
        // 최종 추천사
        final_recommendation: this.generateFinalRecommendation(student, topikScores),
        
        average_grade: 'B+'
      };
      
      return reportData;
      
    } catch (error) {
      console.error('❌ Failed to fetch report data:', error);
      throw error;
    }
  }

  /**
   * 템플릿에 데이터 바인딩
   */
  bindDataToTemplate(template, data) {
    let html = template;
    
    // 모든 플레이스홀더를 데이터로 치환
    Object.keys(data).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(placeholder, data[key] || '');
    });
    
    // 남은 플레이스홀더 제거
    html = html.replace(/{{[^}]+}}/g, '');
    
    return html;
  }

  /**
   * 참여도 점수를 퍼센트로 변환
   */
  calculateParticipationRate(grade) {
    const gradeMap = {
      'A': 95,
      'B': 85,
      'C': 75,
      'D': 65,
      'F': 50
    };
    return gradeMap[grade] || 75;
  }

  /**
   * 다음 상담 예정일 계산 (2주 후)
   */
  getNextConsultationDate() {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toLocaleDateString('ko-KR');
  }

  /**
   * TOPIK 성장 추이 계산
   */
  calculateGrowthTrend(topikHistory) {
    if (!topikHistory || topikHistory.length < 2) {
      return '측정 중';
    }

    // 최근 2개의 시험 비교
    const recent = topikHistory[0];
    const previous = topikHistory[1];

    let recentTotal = 0;
    let previousTotal = 0;

    try {
      const recentScores = typeof recent.detailed_scores === 'string' ? 
        JSON.parse(recent.detailed_scores) : recent.detailed_scores || {};
      const previousScores = typeof previous.detailed_scores === 'string' ? 
        JSON.parse(previous.detailed_scores) : previous.detailed_scores || {};
      
      recentTotal = recentScores.total || recent.score || 0;
      previousTotal = previousScores.total || previous.score || 0;
    } catch (e) {
      console.error('Failed to parse scores for growth trend:', e);
      return '측정 중';
    }

    const difference = recentTotal - previousTotal;
    
    if (difference > 10) {
      return `크게 향상 (↑${difference}점)`;
    } else if (difference > 0) {
      return `향상 (↑${difference}점)`;
    } else if (difference === 0) {
      return '유지';
    } else if (difference > -10) {
      return `소폭 하락 (↓${Math.abs(difference)}점)`;
    } else {
      return `하락 (↓${Math.abs(difference)}점)`;
    }
  }

  /**
   * 상담 이력 HTML 생성
   */
  async generateConsultationHistory(studentId, currentConsultationId) {
    try {
      // 최근 상담 5개 조회 (현재 상담 제외)
      const consultations = await db('consultations')
        .where('student_id', studentId)
        .whereNot('consultation_id', currentConsultationId)
        .orderBy('consultation_date', 'desc')
        .limit(5)
        .select('consultation_date', 'content_ko', 'consultation_type');

      if (!consultations || consultations.length === 0) {
        return '<p style="padding: 10px; color: #666;">이전 상담 이력이 없습니다.</p>';
      }

      const historyHTML = consultations.map(consultation => {
        const date = new Date(consultation.consultation_date).toLocaleDateString('ko-KR');
        const typeLabel = {
          'academic': '학업 상담',
          'career': '진로 상담',
          'life': '생활 상담',
          'visa': '비자 상담',
          'other': '기타 상담'
        }[consultation.consultation_type] || '일반 상담';

        const content = consultation.content_ko ? 
          consultation.content_ko.substring(0, 100) + (consultation.content_ko.length > 100 ? '...' : '') : 
          '상담 내용 없음';

        return `
          <div style="background: #f8f9fa; border-left: 3px solid #004E89; padding: 10px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <strong style="color: #004E89;">${date}</strong>
              <span style="color: #666; font-size: 9pt;">${typeLabel}</span>
            </div>
            <p style="margin: 0; color: #424242; line-height: 1.6;">${content}</p>
          </div>
        `;
      }).join('');

      return historyHTML;
    } catch (error) {
      console.error('Failed to generate consultation history:', error);
      return '<p style="padding: 10px; color: #666;">상담 이력을 불러올 수 없습니다.</p>';
    }
  }

  // 새로운 helper 함수들 추가
  calculateVocabulary(level) {
    const vocabMap = { 1: 200, 2: 350, 3: 500, 4: 700, 5: 850, 6: 1000 };
    return vocabMap[level] || 100;
  }
  
  calculateVocabularyPercentage(level) {
    return Math.round((this.calculateVocabulary(level) / 1000) * 100);
  }
  
  generateUniversityTimeline(history) {
    if (!history || history.length === 0) {
      return '<div class="timeline-item"><div class="timeline-date">현재</div><p>목표 대학 미정</p></div>';
    }
    
    return history.map(item => `
      <div class="timeline-item">
        <div class="timeline-date">${new Date(item.change_date).toLocaleDateString('ko-KR')}</div>
        <strong>${item.university || '미정'}</strong> - ${item.major || '미정'}
      </div>
    `).join('');
  }
  
  async generateConsultationBoxes(studentId) {
    const consultations = await db('consultations')
      .where('student_id', studentId)
      .orderBy('consultation_date', 'desc')
      .limit(3);
    
    return consultations.map(c => `
      <div class="consultation-box">
        <div class="timeline-date">${new Date(c.consultation_date).toLocaleDateString('ko-KR')}</div>
        <h4>${c.consultation_type === 'academic' ? '학업 상담' : '진로 상담'}</h4>
        <p>${c.content_ko || c.notes || '상담 내용'}</p>
      </div>
    `).join('');
  }
  
  generateTopikHistoryRows(scores) {
    if (!scores || scores.length === 0) {
      return '<tr><td colspan="7">아직 응시 기록이 없습니다.</td></tr>';
    }
    
    return scores.map((score, index) => {
      const prevScore = scores[index + 1];
      const growth = prevScore ? 
        Math.round(((score.score - prevScore.score) / prevScore.score) * 100) : 0;
      
      let scoreData = {};
      try {
        scoreData = typeof score.detailed_scores === 'string' ? 
          JSON.parse(score.detailed_scores) : score.detailed_scores || {};
      } catch (e) {
        scoreData = {};
      }
      
      return `
        <tr>
          <td>${scoreData.test_number || '-'}회</td>
          <td>${new Date(score.exam_date).toLocaleDateString('ko-KR')}</td>
          <td>${scoreData.reading || 0}</td>
          <td>${scoreData.listening || 0}</td>
          <td>${scoreData.total || score.score || 0}</td>
          <td><span class="badge badge-info">${score.grade || '-'}급</span></td>
          <td>${growth > 0 ? `+${growth}%` : growth < 0 ? `${growth}%` : '-'}</td>
        </tr>
      `;
    }).join('');
  }
  
  generateFinalRecommendation(student, topik) {
    const level = topik.level || 0;
    const name = student.name_ko || '해당';
    
    let base = `본 기관은 ${name} 학생의 한국 대학 진학을 적극 추천합니다`;
    
    return base;
  }

  // 새 템플릿용 Helper 함수들
  generateTopikScoreTable(topikHistory) {
    if (!topikHistory || topikHistory.length === 0) {
      return `<tr>
        <td colspan="7" style="text-align: center; color: #7f8c8d;">아직 응시 기록이 없습니다.</td>
      </tr>`;
    }
    
    return topikHistory.map((exam, index) => {
      let scores = {};
      try {
        scores = typeof exam.detailed_scores === 'string' ? 
          JSON.parse(exam.detailed_scores) : exam.detailed_scores || {};
      } catch (e) {
        scores = {};
      }
      
      // 성장률 계산
      let growth = '-';
      if (index > 0) {
        const prevExam = topikHistory[index - 1];
        let prevScores = {};
        try {
          prevScores = typeof prevExam.detailed_scores === 'string' ? 
            JSON.parse(prevExam.detailed_scores) : prevExam.detailed_scores || {};
        } catch (e) {
          prevScores = {};
        }
        const currentTotal = scores.total || exam.score || 0;
        const prevTotal = prevScores.total || prevExam.score || 0;
        if (prevTotal > 0) {
          const diff = currentTotal - prevTotal;
          growth = diff > 0 ? `+${diff}` : `${diff}`;
        }
      }
      
      return `<tr>
        <td>${scores.test_number || '-'}회</td>
        <td>${new Date(exam.exam_date).toLocaleDateString('ko-KR')}</td>
        <td><strong>${scores.reading || 0}</strong>/100</td>
        <td><strong>${scores.listening || 0}</strong>/100</td>
        <td><strong>${scores.total || exam.score || 0}</strong>/200</td>
        <td><span class="badge">${exam.grade || '-'}급</span></td>
        <td>${growth}</td>
      </tr>`;
    }).join('');
  }
  
  generateStrengthList(topikScores) {
    const strengths = [];
    
    if (topikScores.listening >= 40) {
      strengths.push('듣기 영역에서 안정적인 점수 유지');
    }
    if (topikScores.reading >= 40) {
      strengths.push('읽기 영역에서 우수한 이해력 보임');
    }
    strengths.push('꾸준한 출석률과 성실한 학습 태도');
    strengths.push('적극적인 수업 참여');
    
    return strengths.map(item => `<li>${item}</li>`).join('');
  }
  
  generateWeaknessList(topikScores) {
    const weaknesses = [];
    
    if (!topikScores.writing || topikScores.writing === 0) {
      weaknesses.push('쓰기 영역 집중 학습 필요');
    }
    if (topikScores.reading < 40) {
      weaknesses.push('읽기 속도 및 이해력 향상 필요');
    }
    if (topikScores.listening < 40) {
      weaknesses.push('듣기 집중력 강화 필요');
    }
    weaknesses.push('문법 구조 이해 강화');
    weaknesses.push('어휘력 확장 필요');
    
    return weaknesses.map(item => `<li>${item}</li>`).join('');
  }
  
  generateUniversityGoalsTimeline(student, universityHistory) {
    let timeline = '';
    
    // 현재 목표
    timeline += `
      <div class="timeline-item">
        <div class="timeline-date">현재 목표</div>
        <div class="timeline-title">${student.desired_university || '목표 대학 설정 중'}</div>
        <div class="timeline-desc">${student.desired_major || '전공 미정'} • 2026년 3월 입학 목표</div>
      </div>`;
    
    // 변경 이력
    if (universityHistory && universityHistory.length > 0) {
      universityHistory.slice(0, 3).forEach(history => {
        timeline += `
          <div class="timeline-item">
            <div class="timeline-date">${new Date(history.change_date).toLocaleDateString('ko-KR')}</div>
            <div class="timeline-title">${history.university || '미정'}</div>
            <div class="timeline-desc">${history.major || '전공 미정'}</div>
          </div>`;
      });
    }
    
    return timeline;
  }
  
  async generateConsultationTimeline(studentId) {
    try {
      const consultations = await db('consultations')
        .where('student_id', studentId)
        .orderBy('consultation_date', 'desc')
        .limit(3)
        .select('consultation_date', 'consultation_type', 'content_ko', 'notes');
      
      if (!consultations || consultations.length === 0) {
        return '<div class="timeline-item"><div class="timeline-desc">상담 이력이 없습니다.</div></div>';
      }
      
      return consultations.map(consultation => {
        const typeLabel = {
          'academic': '진로 상담',
          'career': '진로 상담',
          'life': '생활 상담',
          'visa': '비자 상담',
          'phone': '전화 상담'
        }[consultation.consultation_type] || '일반 상담';
        
        const content = consultation.content_ko || consultation.notes || '상담 내용 없음';
        
        return `
          <div class="timeline-item">
            <div class="timeline-date">${new Date(consultation.consultation_date).toLocaleDateString('ko-KR')}</div>
            <div class="timeline-title">${typeLabel}</div>
            <div class="timeline-desc">${content.substring(0, 150)}${content.length > 150 ? '...' : ''}</div>
          </div>`;
      }).join('');
    } catch (error) {
      console.error('Failed to generate consultation timeline:', error);
      return '<div class="timeline-item"><div class="timeline-desc">상담 이력을 불러올 수 없습니다.</div></div>';
    }
  }
  
  generateRatingStars(rating) {
    const ratingMap = {
      'excellent': '★★★★★',
      'good': '★★★★☆',
      'average': '★★★☆☆',
      'below_average': '★★☆☆☆',
      'poor': '★☆☆☆☆'
    };
    return ratingMap[rating] || '★★★☆☆';
  }

  /**
   * 여러 상담 보고서를 하나의 PDF로 병합
   */
  async generateBatchReport(consultationIds) {
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      let combinedHtml = '';
      
      for (const consultationId of consultationIds) {
        const data = await this.fetchReportData(consultationId);
        const template = await fs.readFile(this.templatePath, 'utf-8');
        const html = this.bindDataToTemplate(template, data);
        
        // HTML에서 body 태그 내용만 추출
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyMatch) {
          combinedHtml += bodyMatch[1];
        }
      }
      
      // 완전한 HTML 문서 생성
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <style>
            /* 템플릿의 스타일 복사 */
            ${await this.extractStyles()}
          </style>
        </head>
        <body>
          ${combinedHtml}
        </body>
        </html>
      `;
      
      await page.setContent(fullHtml, {
        waitUntil: 'networkidle0'
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: '<div style="width: 100%; text-align: center; font-size: 10px; color: #666; margin: 0 auto;">페이지 <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        preferCSSPageSize: true
      });
      
      await page.close();
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('❌ Batch PDF generation error:', error);
      throw error;
    }
  }

  /**
   * 템플릿에서 스타일 추출
   */
  async extractStyles() {
    const template = await fs.readFile(this.templatePath, 'utf-8');
    const styleMatch = template.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    return styleMatch ? styleMatch[1] : '';
  }
}

// 싱글톤 인스턴스
const pdfGenerator = new PDFGenerator();

// 프로세스 종료 시 브라우저 정리
process.on('exit', async () => {
  await pdfGenerator.closeBrowser();
});

process.on('SIGINT', async () => {
  await pdfGenerator.closeBrowser();
  process.exit(0);
});

module.exports = pdfGenerator;