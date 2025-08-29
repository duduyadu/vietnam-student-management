const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const pdfService = require('./pdfService');

class ReportService {
  // 학생 정보 조회
  async getStudentInfo(studentId) {
    try {
      // students 테이블에서 직접 조회
      const student = await db('students')
        .where('student_id', studentId)
        .first();

      if (!student) {
        throw new Error('Student not found');
      }

      // 필요한 필드 정리
      const studentInfo = {
        student_id: student.student_id,
        student_code: student.student_code,
        name: student.name_ko || student.name_vi || student.name || '',
        name_ko: student.name_ko || '',
        name_vi: student.name_vi || '',
        birth_date: student.birth_date,
        gender: student.gender,
        phone: student.phone,
        email: student.email,
        address_korea: student.address_korea,
        address_vietnam: student.address_vietnam,
        parent_name: student.parent_name,
        parent_phone: student.parent_phone,
        high_school: student.high_school,
        gpa: student.gpa,
        desired_major: student.desired_major,
        desired_university: student.desired_university,
        visa_type: student.visa_type,
        visa_expiry: student.visa_expiry,
        alien_registration: student.alien_registration,
        status: student.status,
        enrollment_date: student.enrollment_date
      };

      return studentInfo;
    } catch (error) {
      console.error('Error fetching student info:', error);
      throw error;
    }
  }

  // 상담 기록 조회
  async getConsultations(studentId, dateFrom = null, dateTo = null) {
    try {
      let query = db('consultations as c')
        .leftJoin('users as u', 'c.teacher_id', 'u.user_id')
        .where('c.student_id', studentId)
        .select(
          'c.*',
          'u.full_name as teacher_name'
        )
        .orderBy('c.consultation_date', 'desc');

      if (dateFrom) {
        query = query.where('c.consultation_date', '>=', dateFrom);
      }
      if (dateTo) {
        query = query.where('c.consultation_date', '<=', dateTo);
      }

      return await query;
    } catch (error) {
      console.error('Error fetching consultations:', error);
      throw error;
    }
  }

  // 시험 결과 조회
  async getExamResults(studentId, limit = 10) {
    try {
      const results = await db('exam_results')
        .where('student_id', studentId)
        .orderBy('exam_date', 'desc')
        .limit(limit);

      return results;
    } catch (error) {
      console.error('Error fetching exam results:', error);
      throw error;
    }
  }

  // 학습 진도 조회
  async getLearningProgress(studentId, limit = 5) {
    try {
      const progress = await db('learning_progress')
        .where('student_id', studentId)
        .orderBy('record_date', 'desc')
        .limit(limit);

      return progress;
    } catch (error) {
      console.error('Error fetching learning progress:', error);
      throw error;
    }
  }

  // 학업 목표 조회
  async getAcademicGoals(studentId) {
    try {
      const goals = await db('academic_goals')
        .where('student_id', studentId)
        .where('status', 'in_progress')
        .orderBy('target_date', 'asc');

      return goals;
    } catch (error) {
      console.error('Error fetching academic goals:', error);
      throw error;
    }
  }

  // 성적 추이 분석
  analyzeScoreTrends(examResults) {
    if (examResults.length < 2) {
      return {
        trend: 'insufficient_data',
        improvement: 0,
        averageScore: examResults[0]?.total_score || 0
      };
    }

    const latest = examResults[0];
    const previous = examResults[1];
    
    const improvement = latest.total_score - previous.total_score;
    const averageScore = examResults.reduce((sum, exam) => sum + exam.total_score, 0) / examResults.length;
    
    let trend = 'stable';
    if (improvement > 10) trend = 'improving';
    else if (improvement < -10) trend = 'declining';

    return {
      trend,
      improvement,
      averageScore: Math.round(averageScore),
      latestScore: latest.total_score,
      latestLevel: latest.level
    };
  }

  // TOPIK 레벨 계산 (TOPIK I 기준)
  calculateTopikLevel(score) {
    // TOPIK I (200점 만점)
    if (score >= 140) return 'TOPIK 2급';
    if (score >= 80) return 'TOPIK 1급';
    return '미달';
  }

  // 종합 보고서 데이터 생성
  async generateReportData(studentId, consultationId = null, options = {}) {
    try {
      // 병렬로 데이터 조회
      const [student, consultations, examResults, learningProgress, goals] = await Promise.all([
        this.getStudentInfo(studentId),
        this.getConsultations(studentId, options.dateFrom, options.dateTo),
        this.getExamResults(studentId),
        this.getLearningProgress(studentId),
        this.getAcademicGoals(studentId)
      ]);

      // 특정 상담 기록 찾기
      let currentConsultation = null;
      if (consultationId) {
        currentConsultation = consultations.find(c => c.consultation_id === parseInt(consultationId));
      } else if (consultations.length > 0) {
        currentConsultation = consultations[0]; // 최신 상담 기록
      }

      // 성적 추이 분석
      const scoreTrends = this.analyzeScoreTrends(examResults);

      // 최신 학습 진도
      const latestProgress = learningProgress[0] || {
        attendance_rate: 0,
        homework_completion_rate: 0,
        class_participation: 'N/A'
      };

      // 보고서 데이터 구성
      return {
        reportDate: new Date().toISOString(),
        student: {
          ...student,
          // EAV 패턴에서 추출한 속성들을 정리
          name: student.name || student.korean_name || student.vietnamese_name || '',
          email: student.email || '',
          phone: student.phone || '',
          birth_date: student.birth_date || '',
          agency_name: student.agency_name || '미지정'
        },
        consultation: currentConsultation,
        consultationHistory: consultations.slice(0, 5), // 최근 5개
        examResults: {
          latest: examResults[0] || null,
          history: examResults,
          trends: scoreTrends
        },
        learningProgress: {
          current: latestProgress,
          history: learningProgress
        },
        academicGoals: goals,
        statistics: {
          totalConsultations: consultations.length,
          averageScore: scoreTrends.averageScore,
          attendanceRate: latestProgress.attendance_rate || 0,
          improvementRate: scoreTrends.improvement
        }
      };
    } catch (error) {
      console.error('Error generating report data:', error);
      throw error;
    }
  }

  // HTML 보고서 생성
  generateHTMLReport(data) {
    const { student, consultation, examResults, learningProgress, statistics } = data;
    
    // 날짜 포맷팅 함수
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR');
    };

    // 점수를 퍼센트로 변환
    const scoreToPercent = (score, max = 100) => {
      return Math.round((score / max) * 100);
    };

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${student.name} - 상담 보고서</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Noto Sans KR', sans-serif;
            color: #1a1a1a;
            line-height: 1.6;
            background: white;
        }
        
        .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
        }
        
        /* 헤더 섹션 */
        .header {
            border-bottom: 3px solid #FF6B35;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            color: #FF6B35;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            font-size: 18px;
            color: #666;
        }
        
        .student-info {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 15px;
        }
        
        .info-item {
            font-size: 14px;
        }
        
        .info-item strong {
            color: #333;
        }
        
        /* 섹션 스타일 */
        .section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #FF6B35;
            border-left: 4px solid #FF6B35;
            padding-left: 12px;
            margin-bottom: 20px;
        }
        
        /* 점수 카드 */
        .score-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .score-card {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        
        .score-card .label {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .score-card .value {
            font-size: 28px;
            font-weight: 700;
            color: #FF6B35;
        }
        
        .score-card .unit {
            font-size: 16px;
            color: #999;
        }
        
        .score-card .change {
            font-size: 12px;
            margin-top: 5px;
        }
        
        .score-card .change.up {
            color: #4CAF50;
        }
        
        .score-card .change.down {
            color: #f44336;
        }
        
        /* 진도 바 */
        .progress-bars {
            display: grid;
            gap: 15px;
        }
        
        .progress-item {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .progress-label {
            flex: 0 0 120px;
            font-size: 14px;
            color: #333;
        }
        
        .progress-bar {
            flex: 1;
            height: 25px;
            background: #e9ecef;
            border-radius: 12px;
            overflow: hidden;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #FF6B35, #ff8c5a);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 10px;
            color: white;
            font-size: 12px;
            font-weight: 500;
        }
        
        /* 상담 내용 박스 */
        .consultation-box {
            background: #fff9f5;
            border: 1px solid #ffe4d6;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .consultation-box h4 {
            font-size: 16px;
            color: #FF6B35;
            margin-bottom: 10px;
        }
        
        .consultation-box p {
            font-size: 14px;
            color: #333;
            line-height: 1.8;
        }
        
        /* 목표 리스트 */
        .goals-list {
            list-style: none;
            padding: 0;
        }
        
        .goals-list li {
            padding: 12px;
            background: #f8f9fa;
            border-left: 3px solid #FF6B35;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .goals-list li .deadline {
            color: #666;
            font-size: 12px;
            margin-left: 10px;
        }
        
        /* 표 스타일 */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .data-table th,
        .data-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
            font-size: 14px;
        }
        
        .data-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #333;
        }
        
        .data-table tr:hover {
            background: #f8f9fa;
        }
        
        /* 푸터 */
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        
        /* 인쇄 스타일 */
        @media print {
            body {
                background: white;
            }
            
            .container {
                max-width: 100%;
                padding: 0;
            }
            
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- 헤더 -->
        <div class="header">
            <h1>베트남 유학생 상담 보고서</h1>
            <div class="subtitle">Vietnamese Student Consultation Report</div>
            <div class="student-info">
                <div class="info-item">
                    <strong>이름:</strong> ${student.name}
                </div>
                <div class="info-item">
                    <strong>학생 코드:</strong> ${student.student_code}
                </div>
                <div class="info-item">
                    <strong>유학원:</strong> ${student.agency_name}
                </div>
                <div class="info-item">
                    <strong>연락처:</strong> ${student.phone || '-'}
                </div>
                <div class="info-item">
                    <strong>이메일:</strong> ${student.email || '-'}
                </div>
                <div class="info-item">
                    <strong>보고서 생성일:</strong> ${formatDate(data.reportDate)}
                </div>
            </div>
        </div>
        
        <!-- 학습 성과 요약 -->
        <div class="section">
            <h2 class="section-title">학습 성과 요약</h2>
            <div class="score-cards">
                ${examResults.latest ? `
                    <div class="score-card">
                        <div class="label">최근 TOPIK 점수</div>
                        <div class="value">${examResults.latest.total_score}<span class="unit">/300</span></div>
                        ${examResults.trends.improvement !== 0 ? `
                            <div class="change ${examResults.trends.improvement > 0 ? 'up' : 'down'}">
                                ${examResults.trends.improvement > 0 ? '↑' : '↓'} ${Math.abs(examResults.trends.improvement)}점
                            </div>
                        ` : ''}
                    </div>
                    <div class="score-card">
                        <div class="label">현재 레벨</div>
                        <div class="value">${examResults.latest.topik_level || 'N/A'}</div>
                    </div>
                ` : ''}
                <div class="score-card">
                    <div class="label">학습 진도</div>
                    <div class="value">${statistics.progressRate || 0}<span class="unit">%</span></div>
                </div>
                <div class="score-card">
                    <div class="label">상담 횟수</div>
                    <div class="value">${statistics.totalConsultations || 0}<span class="unit">회</span></div>
                </div>
            </div>
        </div>
        
        <!-- 영역별 점수 -->
        ${examResults.latest ? `
        <div class="section">
            <h2 class="section-title">영역별 성적 현황</h2>
            <div class="progress-bars">
                <div class="progress-item">
                    <div class="progress-label">읽기 (Reading)</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${scoreToPercent(examResults.latest.reading_score)}%">
                            ${examResults.latest.reading_score}/100
                        </div>
                    </div>
                </div>
                <div class="progress-item">
                    <div class="progress-label">듣기 (Listening)</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${scoreToPercent(examResults.latest.listening_score)}%">
                            ${examResults.latest.listening_score}/100
                        </div>
                    </div>
                </div>
                ${examResults.latest.writing_score ? `
                <div class="progress-item">
                    <div class="progress-label">쓰기 (Writing)</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${scoreToPercent(examResults.latest.writing_score)}%">
                            ${examResults.latest.writing_score}/100
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}
        
        <!-- 상담 내용 -->
        ${consultation ? `
        <div class="section">
            <h2 class="section-title">최근 상담 내용</h2>
            <div class="consultation-box">
                <h4>상담 일자: ${formatDate(consultation.consultation_date)} | 상담 유형: ${consultation.consultation_type === 'in_person' ? '대면 상담' : consultation.consultation_type}</h4>
                <p><strong>상담 내용:</strong><br>${consultation.content_ko || '내용 없음'}</p>
                ${consultation.action_items ? `
                    <p><strong>실행 계획:</strong><br>${consultation.action_items}</p>
                ` : ''}
                ${consultation.next_consultation_date ? `
                    <p><strong>다음 상담 예정일:</strong> ${formatDate(consultation.next_consultation_date)}</p>
                ` : ''}
            </div>
        </div>
        ` : ''}
        
        <!-- 학업 목표 -->
        ${data.academicGoals && data.academicGoals.length > 0 ? `
        <div class="section">
            <h2 class="section-title">학업 목표</h2>
            <ul class="goals-list">
                ${data.academicGoals.map(goal => `
                    <li>
                        ${goal.goal_description}
                        ${goal.target_date ? `<span class="deadline">목표일: ${formatDate(goal.target_date)}</span>` : ''}
                    </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}
        
        <!-- 시험 성적 이력 -->
        ${examResults.history && examResults.history.length > 1 ? `
        <div class="section">
            <h2 class="section-title">시험 성적 이력</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>시험 날짜</th>
                        <th>시험 유형</th>
                        <th>읽기</th>
                        <th>듣기</th>
                        <th>쓰기</th>
                        <th>총점</th>
                        <th>레벨</th>
                    </tr>
                </thead>
                <tbody>
                    ${examResults.history.slice(0, 5).map(exam => `
                        <tr>
                            <td>${formatDate(exam.exam_date)}</td>
                            <td>${exam.exam_type}</td>
                            <td>${exam.reading_score || '-'}</td>
                            <td>${exam.listening_score || '-'}</td>
                            <td>${exam.writing_score || '-'}</td>
                            <td><strong>${exam.total_score}</strong></td>
                            <td>${exam.level}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <!-- 푸터 -->
        <div class="footer">
            <p>이 보고서는 ${formatDate(data.reportDate)}에 생성되었습니다.</p>
            <p>© 베트남 유학생 통합 관리 시스템</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // 보고서 파일 저장
  async saveReportFile(studentId, reportHTML, reportType = 'consultation') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `report_${studentId}_${reportType}_${timestamp}.html`;
      const filePath = path.join(__dirname, '..', 'uploads', 'reports', fileName);
      
      // 디렉토리 생성
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // HTML 파일 저장
      await fs.writeFile(filePath, reportHTML, 'utf8');
      
      // DB에 기록
      const [reportId] = await db('generated_reports').insert({
        student_id: studentId,
        report_type: reportType,
        report_title: `상담 보고서 - ${timestamp}`,
        file_path: filePath,
        file_size: Buffer.byteLength(reportHTML, 'utf8'),
        generated_by: 1 // TODO: 실제 사용자 ID 사용
      }).returning('report_id');
      
      return {
        reportId,
        fileName,
        filePath
      };
    } catch (error) {
      console.error('Error saving report file:', error);
      throw error;
    }
  }

  // 메인 보고서 생성 메서드 (다국어 지원)
  async generateReport(studentId, templateCode, dateRange = {}, userId = 1, language = 'ko') {
    const startTime = Date.now();
    
    try {
      console.log(`Starting report generation for student ${studentId} with template ${templateCode} in ${language}`);
      
      // 템플릿 조회
      const template = await db('report_templates')
        .where('template_code', templateCode)
        .where('is_active', true)
        .first();
      
      if (!template) {
        throw new Error('Template not found');
      }
      
      // 보고서 데이터 생성
      const reportData = await this.generateReportData(studentId, null, {
        dateFrom: dateRange.start,
        dateTo: dateRange.end
      });
      
      // 언어별 HTML 보고서 생성
      const htmlContent = language === 'vi' 
        ? this.generateHTMLReportVietnamese(reportData)
        : this.generateHTMLReport(reportData);
      
      // 파일 저장 경로 설정
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const langSuffix = language === 'vi' ? 'VI' : 'KO';
      const htmlFileName = `report_${studentId}_${templateCode}_${langSuffix}_${timestamp}.html`;
      const pdfFileName = `report_${studentId}_${templateCode}_${langSuffix}_${timestamp}.pdf`;
      const htmlPath = path.join('uploads', 'reports', htmlFileName);
      const pdfPath = path.join('uploads', 'reports', pdfFileName);
      const fullHtmlPath = path.join(__dirname, '..', htmlPath);
      const fullPdfPath = path.join(__dirname, '..', pdfPath);
      
      // 디렉토리 생성
      await fs.mkdir(path.dirname(fullHtmlPath), { recursive: true });
      
      // HTML 파일 저장 (UTF-8 인코딩 명시)
      await fs.writeFile(fullHtmlPath, htmlContent, { encoding: 'utf8' });
      
      // PDF 생성
      console.log('Generating PDF from HTML...');
      let pdfResult;
      try {
        console.log('Step 1: Enhancing HTML for PDF...');
        // HTML 개선 (언어별 폰트 적용)
        const enhancedHTML = pdfService.enhanceHTMLForPDF(htmlContent, language);
        console.log(`Step 1 complete: HTML enhanced (${enhancedHTML.length} chars)`);
        
        console.log('Step 2: Generating PDF buffer...');
        // PDF 생성
        const pdfBuffer = await pdfService.generatePDFFromHTML(enhancedHTML);
        console.log(`Step 2 complete: PDF buffer generated (${pdfBuffer.length} bytes)`);
        
        console.log('Step 3: Writing PDF to file...');
        console.log(`PDF path: ${fullPdfPath}`);
        // PDF 파일 저장
        await fs.writeFile(fullPdfPath, pdfBuffer);
        console.log('Step 3 complete: PDF written to file');
        
        console.log('Step 4: Getting file stats...');
        // 파일 정보 가져오기
        const stats = await fs.stat(fullPdfPath);
        console.log(`Step 4 complete: File size = ${stats.size} bytes`);
        
        pdfResult = {
          filePath: pdfPath,
          fileSize: stats.size
        };
        
        console.log(`✅ PDF saved successfully: ${pdfPath} (${stats.size} bytes)`);
      } catch (pdfError) {
        console.error('❌ PDF generation failed!');
        console.error('Error type:', pdfError.name);
        console.error('Error message:', pdfError.message);
        console.error('Error stack:', pdfError.stack);
        
        // PDF 생성 실패시 HTML만 사용
        pdfResult = {
          filePath: pdfPath,
          fileSize: 0
        };
        
        console.log('⚠️ Falling back to HTML only mode');
      }
      
      // DB에 보고서 기록 저장
      const [reportResult] = await db('generated_reports').insert({
        student_id: studentId,
        template_id: template.template_id,
        report_title: `${template.template_name} - ${reportData.student.name}`,
        report_date: new Date(),
        period_start: dateRange.start || null,
        period_end: dateRange.end || null,
        report_data: JSON.stringify(reportData),
        html_path: htmlPath,
        pdf_path: pdfResult.filePath,
        file_size: pdfResult.fileSize,
        status: 'completed',
        generation_time_ms: Date.now() - startTime,
        generated_by: userId
      }).returning('report_id');
      
      // PostgreSQL returns an object, extract the report_id
      const reportId = reportResult?.report_id || reportResult;
      
      console.log(`Report generated successfully with ID: ${reportId}`);
      
      return {
        reportId,
        htmlPath,
        pdfPath: pdfResult.filePath,
        generationTime: Date.now() - startTime,
        language
      };
      
    } catch (error) {
      console.error('Error generating report:', error);
      
      // 실패 기록 저장
      try {
        await db('generated_reports').insert({
          student_id: studentId,
          template_id: 1,
          report_title: `Failed Report - ${templateCode}`,
          report_date: new Date(),
          status: 'failed',
          error_message: error.message,
          generation_time_ms: Date.now() - startTime,
          generated_by: userId
        });
      } catch (dbError) {
        console.error('Failed to save error record:', dbError);
      }
      
      throw error;
    }
  }

  // 베트남어 HTML 보고서 생성
  generateHTMLReportVietnamese(data) {
    const { student, consultation, examResults, learningProgress, statistics } = data;
    
    // 날짜 포맷팅 함수
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    };

    // 점수를 퍼센트로 변환
    const scoreToPercent = (score, max = 100) => {
      return Math.round((score / max) * 100);
    };

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${student.name} - Báo cáo tư vấn</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@300;400;500;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Noto Sans', sans-serif;
            color: #1a1a1a;
            line-height: 1.6;
            background: white;
        }
        
        .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
        }
        
        /* Header section */
        .header {
            border-bottom: 3px solid #FF6B35;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            color: #FF6B35;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            font-size: 18px;
            color: #666;
        }
        
        .student-info {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 15px;
        }
        
        .info-item {
            font-size: 14px;
        }
        
        .info-item strong {
            color: #333;
        }
        
        /* Section styles */
        .section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #FF6B35;
            border-left: 4px solid #FF6B35;
            padding-left: 12px;
            margin-bottom: 20px;
        }
        
        /* Score cards */
        .score-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .score-card {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        
        .score-card .label {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .score-card .value {
            font-size: 28px;
            font-weight: 700;
            color: #FF6B35;
        }
        
        .score-card .unit {
            font-size: 16px;
            color: #999;
        }
        
        /* Progress bars */
        .progress-bars {
            display: grid;
            gap: 15px;
        }
        
        .progress-item {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .progress-label {
            flex: 0 0 120px;
            font-size: 14px;
            color: #333;
        }
        
        .progress-bar {
            flex: 1;
            height: 25px;
            background: #e9ecef;
            border-radius: 12px;
            overflow: hidden;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #FF6B35, #ff8c5a);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 10px;
            color: white;
            font-size: 12px;
            font-weight: 500;
        }
        
        /* Consultation box */
        .consultation-box {
            background: #fff9f5;
            border: 1px solid #ffe4d6;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .consultation-box h4 {
            font-size: 16px;
            color: #FF6B35;
            margin-bottom: 10px;
        }
        
        .consultation-box p {
            font-size: 14px;
            color: #333;
            line-height: 1.8;
        }
        
        /* Footer */
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        
        /* Print styles */
        @media print {
            body {
                background: white;
            }
            
            .container {
                max-width: 100%;
                padding: 0;
            }
            
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>Báo cáo tư vấn sinh viên Việt Nam</h1>
            <div class="subtitle">Vietnamese Student Consultation Report</div>
            <div class="student-info">
                <div class="info-item">
                    <strong>Họ tên:</strong> ${student.name}
                </div>
                <div class="info-item">
                    <strong>Mã sinh viên:</strong> ${student.student_code}
                </div>
                <div class="info-item">
                    <strong>Trung tâm:</strong> ${student.agency_name}
                </div>
                <div class="info-item">
                    <strong>Số điện thoại:</strong> ${student.phone || '-'}
                </div>
                <div class="info-item">
                    <strong>Email:</strong> ${student.email || '-'}
                </div>
                <div class="info-item">
                    <strong>Ngày lập báo cáo:</strong> ${formatDate(data.reportDate)}
                </div>
            </div>
        </div>
        
        <!-- Learning Achievement Summary -->
        <div class="section">
            <h2 class="section-title">Tóm tắt thành tích học tập</h2>
            <div class="score-cards">
                ${examResults.latest ? `
                    <div class="score-card">
                        <div class="label">Điểm TOPIK gần nhất</div>
                        <div class="value">${examResults.latest.total_score}<span class="unit">/300</span></div>
                    </div>
                    <div class="score-card">
                        <div class="label">Cấp độ hiện tại</div>
                        <div class="value">${examResults.latest.topik_level || 'N/A'}</div>
                    </div>
                ` : ''}
                <div class="score-card">
                    <div class="label">Tỷ lệ đi học</div>
                    <div class="value">${statistics.progressRate || 0}<span class="unit">%</span></div>
                </div>
                <div class="score-card">
                    <div class="label">Số lần tư vấn</div>
                    <div class="value">${statistics.totalConsultations || 0}<span class="unit">lần</span></div>
                </div>
            </div>
        </div>
        
        <!-- Score by Skills -->
        ${examResults.latest ? `
        <div class="section">
            <h2 class="section-title">Điểm theo kỹ năng</h2>
            <div class="progress-bars">
                <div class="progress-item">
                    <div class="progress-label">Đọc (Reading)</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${scoreToPercent(examResults.latest.reading_score)}%">
                            ${examResults.latest.reading_score}/100
                        </div>
                    </div>
                </div>
                <div class="progress-item">
                    <div class="progress-label">Nghe (Listening)</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${scoreToPercent(examResults.latest.listening_score)}%">
                            ${examResults.latest.listening_score}/100
                        </div>
                    </div>
                </div>
                ${examResults.latest.writing_score ? `
                <div class="progress-item">
                    <div class="progress-label">Viết (Writing)</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${scoreToPercent(examResults.latest.writing_score)}%">
                            ${examResults.latest.writing_score}/100
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}
        
        <!-- Consultation Content -->
        ${consultation ? `
        <div class="section">
            <h2 class="section-title">Nội dung tư vấn gần nhất</h2>
            <div class="consultation-box">
                <h4>Ngày tư vấn: ${formatDate(consultation.consultation_date)} | Hình thức: ${consultation.consultation_type === 'in_person' ? 'Tư vấn trực tiếp' : consultation.consultation_type}</h4>
                <p><strong>Nội dung tư vấn:</strong><br>${consultation.content_ko || 'Không có nội dung'}</p>
                ${consultation.action_items ? `
                    <p><strong>Kế hoạch hành động:</strong><br>${consultation.action_items}</p>
                ` : ''}
                ${consultation.next_consultation_date ? `
                    <p><strong>Ngày tư vấn tiếp theo:</strong> ${formatDate(consultation.next_consultation_date)}</p>
                ` : ''}
            </div>
        </div>
        ` : ''}
        
        <!-- Footer -->
        <div class="footer">
            <p>Báo cáo này được tạo vào ${formatDate(data.reportDate)}.</p>
            <p>© Hệ thống quản lý sinh viên Việt Nam du học</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // 종합 보고서 데이터 생성 메소드
  async generateComprehensiveReportData(studentId, dateFrom = null, dateTo = null, language = 'ko') {
    try {
      console.log('📊 Generating comprehensive report data for student:', studentId);
      
      // 1. 학생 기본 정보 조회
      const student = await this.getStudentInfo(studentId);
      if (!student) {
        throw new Error(`Student with ID ${studentId} not found`);
      }
      
      // 2. 상담 기록 조회 (가장 최근 것)
      const consultations = await this.getConsultations(studentId, dateFrom, dateTo);
      const latestConsultation = consultations && consultations.length > 0 ? consultations[0] : null;
      
      // 3. 시험 결과 조회
      const examResults = await this.getExamResults(studentId);
      const latestExam = examResults && examResults.length > 0 ? examResults[0] : null;
      
      // 3-1. 점수 트렌드 계산 (인라인)
      let scoreTrends = { trend: 'stable', improvement: 0, averageScore: 0 };
      if (examResults && examResults.length > 0) {
        if (examResults.length === 1) {
          scoreTrends = {
            trend: 'insufficient_data',
            improvement: 0,
            averageScore: examResults[0].total_score || 0
          };
        } else {
          const latest = examResults[0];
          const previous = examResults[1];
          const improvement = (latest.total_score || 0) - (previous.total_score || 0);
          const averageScore = examResults.reduce((sum, exam) => sum + (exam.total_score || 0), 0) / examResults.length;
          
          let trend = 'stable';
          if (improvement > 10) trend = 'improving';
          else if (improvement < -10) trend = 'declining';
          
          scoreTrends = {
            trend,
            improvement,
            averageScore: Math.round(averageScore),
            latestScore: latest.total_score || 0,
            previousScore: previous.total_score || 0
          };
        }
      }
      
      // 4. 학습 진도 조회
      const learningProgress = await this.getLearningProgress(studentId);
      
      // 5. 학업 목표 조회
      const academicGoals = await this.getAcademicGoals(studentId);
      
      // 6. 통계 데이터 생성
      const statistics = {
        totalConsultations: consultations ? consultations.length : 0,
        totalExams: examResults ? examResults.length : 0,
        averageScore: examResults && examResults.length > 0 
          ? Math.round(examResults.reduce((acc, exam) => acc + exam.total_score, 0) / examResults.length)
          : 0,
        progressRate: learningProgress && learningProgress.length > 0
          ? Math.round(learningProgress.reduce((acc, prog) => acc + (prog.completion_rate || 0), 0) / learningProgress.length)
          : 0,
        latestTopikLevel: latestExam ? latestExam.topik_level : null
      };
      
      // 7. 보고서 데이터 구조 생성
      const reportData = {
        student: {
          id: student.student_id,
          name: language === 'vi' ? (student.name_vietnam || student.name_korean) : student.name_korean,
          nameKorean: student.name_korean,
          nameVietnam: student.name_vietnam,
          birthDate: student.birth_date,
          school: student.school_name,
          grade: student.grade,
          phone: student.phone,
          address: student.address,
          parentName: student.parent_name,
          parentPhone: student.parent_phone,
          registrationDate: student.registration_date,
          agencyName: student.agency_name || 'N/A'
        },
        consultation: latestConsultation ? {
          consultation_date: latestConsultation.consultation_date,
          consultation_type: latestConsultation.consultation_type,
          teacher_name: latestConsultation.teacher_name,
          content_ko: latestConsultation.content_ko,
          content_vi: latestConsultation.content_vi,
          improvement_notes: latestConsultation.improvement_notes,
          action_items: latestConsultation.action_items,
          next_consultation_date: latestConsultation.next_consultation_date
        } : null,
        examResults: {
          latest: latestExam ? {
            exam_date: latestExam.exam_date,
            exam_type: latestExam.exam_type,
            reading_score: latestExam.reading_score,
            listening_score: latestExam.listening_score,
            writing_score: latestExam.writing_score,
            total_score: latestExam.total_score,
            topik_level: latestExam.topik_level
          } : null,
          history: examResults ? examResults.map(exam => ({
            exam_date: exam.exam_date,
            exam_type: exam.exam_type,
            total_score: exam.total_score,
            topik_level: exam.topik_level
          })) : [],
          trends: scoreTrends
        },
        learningProgress: learningProgress ? learningProgress.map(progress => ({
          subject: progress.subject,
          current_chapter: progress.current_chapter,
          completion_rate: progress.completion_rate,
          last_study_date: progress.last_study_date,
          notes: progress.notes
        })) : [],
        academicGoals: academicGoals ? academicGoals.map(goal => ({
          target_university: goal.target_university,
          target_major: goal.target_major,
          target_topik_level: goal.target_topik_level,
          target_date: goal.target_date,
          is_active: goal.is_active
        })) : [],
        statistics: statistics,
        reportDate: new Date().toISOString(),
        language: language
      };
      
      console.log('✅ Report data generated successfully');
      return reportData;
      
    } catch (error) {
      console.error('❌ Error generating comprehensive report data:', error);
      throw error;
    }
  }

  // PDF 보고서 생성 메인 메소드
  async generateReport(studentId, templateCode, dateRange = {}, userId, language = 'ko') {
    try {
      console.log('📋 Starting report generation...');
      console.log('Student ID:', studentId);
      console.log('Template Code:', templateCode);
      console.log('Date Range:', dateRange);
      console.log('Language:', language);

      // 1. 보고서 데이터 수집
      const reportData = await this.generateComprehensiveReportData(
        studentId,
        dateRange.start,
        dateRange.end,
        language
      );

      // 2. HTML 보고서 생성
      console.log('📝 Generating HTML report...');
      const htmlContent = this.generateHTMLReport(reportData);

      // 3. PDF 디렉토리 생성
      const uploadDir = path.join(__dirname, '..', 'uploads', 'reports');
      await fs.mkdir(uploadDir, { recursive: true });

      // 4. HTML 파일 저장
      const timestamp = Date.now();
      const htmlFileName = `report_${studentId}_${timestamp}.html`;
      const htmlPath = path.join(uploadDir, htmlFileName);
      await fs.writeFile(htmlPath, htmlContent, 'utf8');
      
      // 데이터베이스에 저장할 상대 경로
      const htmlRelativePath = path.join('uploads', 'reports', htmlFileName);
      console.log('✅ HTML saved:', htmlFileName);

      // 5. PDF 생성
      console.log('🖨️ Converting HTML to PDF...');
      const startTime = Date.now();
      
      // pdfService를 사용하여 PDF 생성
      const enhancedHTML = pdfService.enhanceHTMLForPDF(htmlContent, language);
      const pdfBuffer = await pdfService.generatePDFFromHTML(enhancedHTML);
      
      // 6. PDF 파일 저장
      const pdfFileName = `report_${studentId}_${timestamp}.pdf`;
      const pdfPath = path.join(uploadDir, pdfFileName);
      await fs.writeFile(pdfPath, pdfBuffer);
      
      // 데이터베이스에 저장할 상대 경로
      const pdfRelativePath = path.join('uploads', 'reports', pdfFileName);
      
      const generationTime = Date.now() - startTime;
      console.log(`✅ PDF generated in ${generationTime}ms: ${pdfFileName}`);

      // 7. 데이터베이스에 보고서 기록 저장
      const templateResult = await db('report_templates')
        .where('template_code', templateCode)
        .first();

      const insertResult = await db('generated_reports').insert({
        student_id: studentId,
        template_id: templateResult?.template_id || 1,
        report_title: `${reportData.student.name} - 종합 보고서`,
        report_date: new Date().toISOString().split('T')[0],
        period_start: dateRange.start || null,
        period_end: dateRange.end || null,
        status: 'completed',
        pdf_path: pdfRelativePath.replace(/\\/g, '/'),  // Windows 경로 처리
        html_path: htmlRelativePath.replace(/\\/g, '/'),  // Windows 경로 처리
        file_size: pdfBuffer.length,
        generation_time_ms: generationTime,
        generated_by: userId,
        generated_at: new Date(),
        access_count: 0
      }).returning('report_id');
      
      const reportId = insertResult[0]?.report_id || insertResult[0];

      console.log('✅ Report saved to database with ID:', reportId);

      // 8. 결과 반환
      return {
        reportId: reportId,
        pdfPath: pdfFileName,
        htmlPath: htmlFileName,
        generationTime: generationTime,
        fileSize: pdfBuffer.length
      };

    } catch (error) {
      console.error('❌ Error generating report:', error);
      
      // 데이터베이스에 실패 기록
      try {
        const templateResult = await db('report_templates')
          .where('template_code', templateCode)
          .first();
          
        await db('generated_reports').insert({
          student_id: studentId,
          template_id: templateResult?.template_id || 1,
          report_title: `보고서 생성 실패`,
          report_date: new Date().toISOString().split('T')[0],
          status: 'failed',
          error_message: error.message,
          generated_by: userId,
          generated_at: new Date()
        });
      } catch (dbError) {
        console.error('Failed to log error to database:', dbError);
      }
      
      throw error;
    }
  }
}

module.exports = new ReportService();