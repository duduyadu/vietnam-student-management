// reportService.js의 개선된 버전 - consultation-report.html 템플릿 사용
const knex = require('knex');
const knexConfig = require('../knexfile');
const db = knex(knexConfig.development);
const path = require('path');
const fs = require('fs').promises;
const pdfService = require('./pdfService');

class EnhancedReportService {
  // 학업 데이터 조회
  async getAcademicData(studentId) {
    try {
      const result = await db('student_academic_data')
        .where('student_id', studentId)
        .first();
      return result;
    } catch (error) {
      console.error('Error fetching academic data:', error);
      return null;
    }
  }

  // 포트폴리오 데이터 조회
  async getPortfolioData(studentId) {
    try {
      const result = await db('student_portfolio')
        .where('student_id', studentId)
        .first();
      return result;
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      return null;
    }
  }

  // 생활 평가 데이터 조회
  async getEvaluationData(studentId) {
    try {
      const result = await db('student_life_evaluation')
        .where('student_id', studentId)
        .first();
      return result;
    } catch (error) {
      console.error('Error fetching evaluation data:', error);
      return null;
    }
  }

  // 학생 정보 조회
  async getStudentInfo(studentId) {
    try {
      const result = await db('students')
        .where('student_id', studentId)
        .first();
      return result;
    } catch (error) {
      console.error('Error fetching student info:', error);
      return null;
    }
  }

  // 시험 결과 조회
  async getExamResults(studentId) {
    try {
      const results = await db('exam_results')
        .where('student_id', studentId)
        .orderBy('exam_date', 'asc')  // 오름차순으로 변경 (오래된 것부터)
        .limit(10);
      
      // detailed_scores JSON 파싱 및 필드 매핑
      return results.map(exam => {
        let parsedScores = {};
        try {
          if (exam.detailed_scores) {
            parsedScores = typeof exam.detailed_scores === 'string' 
              ? JSON.parse(exam.detailed_scores) 
              : exam.detailed_scores;
          }
        } catch (e) {
          console.error('Error parsing detailed_scores:', e);
        }
        
        return {
          ...exam,
          reading_score: parsedScores.reading || 0,
          listening_score: parsedScores.listening || 0,
          writing_score: parsedScores.writing || 0,
          total_score: parseFloat(exam.score) || parsedScores.total || 0,
          level: exam.grade ? exam.grade.replace('급', '') : (parsedScores.level || '-')
        };
      });
    } catch (error) {
      console.error('Error fetching exam results:', error);
      return [];
    }
  }

  // 상담 기록 조회
  async getConsultations(studentId, limit = 10) {
    try {
      const results = await db('consultations')
        .where('student_id', studentId)
        .orderBy('consultation_date', 'desc')
        .orderBy('consultation_id', 'desc')  // 같은 날짜일 경우 최신 ID 우선
        .limit(limit);
      
      // JSON 필드 파싱 및 병합 처리 (개선된 버전)
      const parsedResults = results.map(consultation => {
        let mergedData = { ...consultation };
        
        // action_items 파싱 (모든 평가 데이터 - 최우선순위)
        if (consultation.action_items) {
          let actionItemsData;
          
          // action_items가 문자열인 경우 파싱
          if (typeof consultation.action_items === 'string') {
            try {
              actionItemsData = JSON.parse(consultation.action_items);
              console.log('✅ Successfully parsed action_items for consultation:', consultation.consultation_id);
            } catch (e) {
              console.error('❌ Error parsing action_items string:', e);
            }
          } 
          // action_items가 이미 객체인 경우 직접 사용
          else if (typeof consultation.action_items === 'object' && consultation.action_items !== null) {
            actionItemsData = consultation.action_items;
            console.log('✅ Using action_items object for consultation:', consultation.consultation_id);
          }
          
          // 파싱된 데이터를 mergedData에 병합 (빈 문자열도 허용)
          if (actionItemsData) {
            Object.keys(actionItemsData).forEach(key => {
              // null과 undefined만 제외, 빈 문자열은 허용
              if (actionItemsData[key] !== null && actionItemsData[key] !== undefined) {
                mergedData[key] = actionItemsData[key];
              }
            });
            console.log('📊 Parsed evaluation data:');
            console.log('  - academic_evaluation:', actionItemsData.academic_evaluation || '[empty]');
            console.log('  - korean_evaluation:', actionItemsData.korean_evaluation || '[empty]');
            console.log('  - final_recommendation:', actionItemsData.final_recommendation || '[empty]');
            console.log('  - strength_areas:', actionItemsData.strength_areas || '[empty]');
            console.log('  - weakness_areas:', actionItemsData.weakness_areas || '[empty]');
          }
        }
        
        // evaluation_data 처리 (보조 데이터 - action_items가 없을 경우만)
        if (consultation.evaluation_data && !consultation.action_items) {
          if (typeof consultation.evaluation_data === 'string') {
            try {
              const parsed = JSON.parse(consultation.evaluation_data);
              Object.keys(parsed).forEach(key => {
                if (parsed[key] !== null && parsed[key] !== undefined) {
                  mergedData[key] = parsed[key];
                }
              });
              console.log('📦 Parsed evaluation_data as fallback for consultation:', consultation.consultation_id);
            } catch (e) {
              console.error('Error parsing evaluation_data:', e);
            }
          } else if (typeof consultation.evaluation_data === 'object' && consultation.evaluation_data !== null) {
            Object.keys(consultation.evaluation_data).forEach(key => {
              if (consultation.evaluation_data[key] !== null && consultation.evaluation_data[key] !== undefined) {
                mergedData[key] = consultation.evaluation_data[key];
              }
            });
            console.log('📦 Merged evaluation_data object as fallback for consultation:', consultation.consultation_id);
          }
        }
        
        return mergedData;
      });
      
      console.log('🔍 Consultations after parsing:', parsedResults.length > 0 ? 
        `First consultation has ${Object.keys(parsedResults[0]).length} keys` : 'No consultations');
      
      return parsedResults;
    } catch (error) {
      console.error('Error fetching consultations:', error);
      return [];
    }
  }

  // 선생님 평가 조회 (최신 3개)
  async getTeacherEvaluations(studentId, limit = 3) {
    try {
      const results = await db('teacher_evaluations as te')
        .leftJoin('users as u', 'te.teacher_id', 'u.user_id')
        .where('te.student_id', studentId)
        .where('te.status', 'approved') // 승인된 평가만
        .select(
          'te.*',
          'u.full_name as teacher_name',
          'u.agency_name as teacher_agency'
        )
        .orderBy('te.evaluation_date', 'desc')
        .limit(limit);
      return results;
    } catch (error) {
      console.error('Error fetching teacher evaluations:', error);
      return [];
    }
  }

  // consultation-report.html 템플릿을 사용한 HTML 생성 (4페이지 전문 보고서)
  async generateHTMLFromTemplate(studentId, language = 'ko') {
    try {
      // 전문 보고서 템플릿 파일 읽기
      const templatePath = path.join(__dirname, '..', 'templates', 'consultation-report.html');
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');
      
      // 필요한 모든 데이터 조회
      const student = await this.getStudentInfo(studentId);
      console.log('🎯 Student info:', {
        id: student?.student_id,
        name_ko: student?.name_ko,
        name_vi: student?.name_vi,
        student_code: student?.student_code
      });
      
      const academicData = await this.getAcademicData(studentId);
      let portfolioData = await this.getPortfolioData(studentId);
      let evaluationData = await this.getEvaluationData(studentId);
      const examResults = await this.getExamResults(studentId);
      const consultations = await this.getConsultations(studentId);
      console.log('🎯 Consultations found:', consultations?.length || 0);
      
      const teacherEvaluations = await this.getTeacherEvaluations(studentId);
      
      // 상담 기록에서 최신 evaluation 데이터 가져오기
      if (consultations && consultations.length > 0) {
        const latestConsultation = consultations[0];
        console.log('🔍 Latest consultation data:');
        console.log('  - Consultation ID:', latestConsultation.consultation_id);
        console.log('  - Evaluation Category:', latestConsultation.evaluation_category);
        console.log('  - Has academic_evaluation?', !!latestConsultation.academic_evaluation);
        console.log('  - Has korean_evaluation?', !!latestConsultation.korean_evaluation);
        console.log('  - Has final_recommendation?', !!latestConsultation.final_recommendation);
        
        // 모든 카테고리의 상담 데이터를 처리 (report, unified, consultation 등)
        // evaluation_category와 관계없이 데이터가 있으면 사용
        if (latestConsultation.evaluation_category === 'unified' || 
            latestConsultation.evaluation_category === 'report' ||
            latestConsultation.action_items || 
            latestConsultation.evaluation_data) {
          
          evaluationData = {
            ...evaluationData,
            // action_items에서 파싱된 텍스트 평가 데이터 (우선순위 높음)
            academic_evaluation: latestConsultation.academic_evaluation || evaluationData?.academic_evaluation,
            korean_evaluation: latestConsultation.korean_evaluation || evaluationData?.korean_evaluation,
            final_recommendation: latestConsultation.final_recommendation || evaluationData?.final_recommendation,
            strength_areas: latestConsultation.strength_areas || evaluationData?.strength_areas,
            weakness_areas: latestConsultation.weakness_areas || evaluationData?.weakness_areas,
            learning_strategy: latestConsultation.learning_strategy || evaluationData?.learning_strategy,
            social_relationship: latestConsultation.social_relationship || evaluationData?.social_relationship,
            class_attitude: latestConsultation.class_attitude || evaluationData?.class_attitude,
            adaptation_level: latestConsultation.adaptation_level || evaluationData?.adaptation_level,
            growth_potential: latestConsultation.growth_potential || evaluationData?.growth_potential,
            counselor_evaluation: latestConsultation.counselor_evaluation || evaluationData?.counselor_evaluation,
            student_opinion: latestConsultation.student_opinion || evaluationData?.student_opinion,
            // 숫자 평가 데이터
            attendance_rate: latestConsultation.attendance_rate || evaluationData?.attendance_rate,
            participation_grade: latestConsultation.participation_grade || evaluationData?.participation_grade,
            vocabulary_known: latestConsultation.vocabulary_known || evaluationData?.vocabulary_known,
            social_rating: latestConsultation.social_rating || evaluationData?.social_rating,
            attitude_rating: latestConsultation.attitude_rating || evaluationData?.attitude_rating,
            adaptation_rating: latestConsultation.adaptation_rating || evaluationData?.adaptation_rating,
            growth_rating: latestConsultation.growth_rating || evaluationData?.growth_rating
          };
          console.log('✅ Merged evaluation data from consultation (category: ' + latestConsultation.evaluation_category + ')');
          console.log('📝 Merged evaluation values:');
          console.log('  - academic_evaluation:', evaluationData.academic_evaluation ? 'Present' : 'Missing');
          console.log('  - korean_evaluation:', evaluationData.korean_evaluation ? 'Present' : 'Missing');
          console.log('  - final_recommendation:', evaluationData.final_recommendation ? 'Present' : 'Missing');
        }
      }
      
      // 포트폴리오 데이터도 상담 기록에서 가져오기
      if (consultations && consultations.length > 0) {
        const latestConsultation = consultations[0];
        if (latestConsultation.club_activities || latestConsultation.volunteer_activities || latestConsultation.awards) {
          portfolioData = {
            ...portfolioData,
            club_activities: latestConsultation.club_activities || portfolioData?.club_activities,
            volunteer_activities: latestConsultation.volunteer_activities || portfolioData?.volunteer_activities,
            awards: latestConsultation.awards || portfolioData?.awards,
            portfolio_status: latestConsultation.portfolio_status || portfolioData?.portfolio_status
          };
          console.log('✅ Merged portfolio data from latest consultation');
        }
      }
      
      // 날짜 포맷팅 함수
      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR');
      };
      
      // 평가를 별점으로 변환
      const ratingToStars = (rating) => {
        const stars = { 
          'excellent': '⭐⭐⭐⭐⭐', 
          'good': '⭐⭐⭐⭐', 
          'average': '⭐⭐⭐', 
          'poor': '⭐⭐' 
        };
        return stars[rating] || '⭐⭐⭐';
      };
      
      // 선생님 평가를 텍스트로 변환
      const getRatingText = (rating) => {
        const texts = {
          'excellent': '매우 우수',
          'good': '우수', 
          'average': '보통',
          'poor': '미흡'
        };
        return texts[rating] || rating;
      };
      
      // TOPIK 성적 추이 SVG 그래프 생성 함수 - 누적 그래프 형태
      const createTOPIKGraph = (data) => {
        if (!data || data.length === 0) return '';
        
        const width = 600;
        const height = 280;  // 높이 증가: 250 → 280
        const padding = { top: 20, right: 40, bottom: 60, left: 50 };  // bottom 여백 증가: 40 → 60
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        // 스케일 계산 - Y축 범위를 50-140으로 설정
        const minScore = 50;
        const maxScore = 140;
        const xStep = chartWidth / Math.max(data.length - 1, 1);
        const yScale = (score) => chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight;
        
        // 누적 영역을 위한 폴리곤 포인트 생성
        const areaPoints = data.map((d, i) => `${padding.left + i * xStep},${padding.top + yScale(d.score)}`).join(' ');
        const baseLinePoints = `${padding.left + (data.length - 1) * xStep},${padding.top + chartHeight} ${padding.left},${padding.top + chartHeight}`;
        const polygonPoints = areaPoints + ' ' + baseLinePoints;
        
        // 선 그리기용 포인트
        const linePoints = areaPoints;
        
        // 그리드 라인 - 50-140 범위, 120점 목표선
        let gridLines = '';
        [50, 60, 70, 80, 90, 100, 110, 120, 130, 140].forEach(score => {
          const y = padding.top + yScale(score);
          const isTarget = score === 120; // TOPIK 2급 목표 (120점)
          gridLines += `
            <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" 
                  stroke="${isTarget ? '#DC2626' : '#E5E7EB'}" stroke-width="${isTarget ? '2' : '1'}" 
                  stroke-dasharray="${isTarget ? '5,3' : '2,2'}" opacity="${isTarget ? '0.8' : '0.5'}"/>
            <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" 
                  font-size="11" fill="${isTarget ? '#DC2626' : '#6B7280'}" font-weight="${isTarget ? '600' : '400'}">
              ${score}
            </text>`;
        });
        
        // 데이터 포인트와 레이블
        let dataPoints = '';
        data.forEach((d, i) => {
          const x = padding.left + i * xStep;
          const y = padding.top + yScale(d.score);
          dataPoints += `
            <circle cx="${x}" cy="${y}" r="5" fill="#6366F1" stroke="white" stroke-width="2"/>
            <text x="${x}" y="${y - 10}" text-anchor="middle" font-size="10" fill="#374151" font-weight="600">
              ${d.score}점
            </text>
            <text x="${x}" y="${height - 25}" text-anchor="middle" font-size="10" fill="#6B7280">
              ${i + 1}차
            </text>`;
        });
        
        return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <!-- 배경 -->
          <rect width="${width}" height="${height}" fill="#FAFAFA" rx="8"/>
          
          <!-- 그리드 라인 -->
          ${gridLines}
          
          <!-- 누적 영역 (그라데이션) -->
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#6366F1;stop-opacity:0.4" />
              <stop offset="100%" style="stop-color:#6366F1;stop-opacity:0.1" />
            </linearGradient>
          </defs>
          <polygon points="${polygonPoints}" fill="url(#scoreGradient)"/>
          
          <!-- 데이터 라인 -->
          <polyline points="${linePoints}" fill="none" stroke="#6366F1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          
          <!-- 데이터 포인트 -->
          ${dataPoints}
          
          <!-- 축 라벨 -->
          <text x="${width/2}" y="${height - 5}" text-anchor="middle" font-size="12" fill="#374151" font-weight="600">
            모의고사 회차
          </text>
          <text x="15" y="${height/2}" text-anchor="middle" font-size="12" fill="#374151" font-weight="600" transform="rotate(-90 15 ${height/2})">
            점수
          </text>
          
          <!-- 범례 제거 -->
        </svg>`;
      };
      
      // TOPIK 점수 테이블 생성 (간략 버전)
      let topikScoreTable = '';
      let topikGraphData = [];
      
      console.log('🔍 DEBUG - examResults:', examResults?.length, 'exams found');
      if (examResults && examResults.length > 0) {
        // 최근 5개만 테이블에 표시
        const recentExams = examResults.slice(-5);
        recentExams.forEach((exam, index) => {
          const growth = index > 0 ? (exam.total_score - recentExams[index-1].total_score) : 0;
          const growthSign = growth > 0 ? '+' : '';
          
          topikScoreTable += `
            <tr>
              <td>${examResults.length - 4 + index}차</td>
              <td>${formatDate(exam.exam_date)}</td>
              <td>${exam.reading_score || 0}</td>
              <td>${exam.listening_score || 0}</td>
              <td>${exam.total_score || 0}</td>
              <td>${exam.level || '-'}급</td>
              <td>${growth !== 0 ? growthSign + growth : '-'}</td>
            </tr>`;
        });
        
        // 그래프 데이터 준비
        topikGraphData = examResults.map((exam, index) => ({
          index: index + 1,
          score: exam.total_score || 0,
          level: exam.level || '-'
        }));
        console.log('🔍 DEBUG - topikGraphData mapped:', topikGraphData);
      } else {
        topikScoreTable = `
          <tr>
            <td colspan="7" style="text-align: center; color: #999;">아직 시험 기록이 없습니다</td>
          </tr>`;
      }
      
      // Create TOPIK graph using the function defined above
      
      // 그래프 생성
      console.log('🔍 DEBUG - Before createTOPIKGraph, topikGraphData:', JSON.stringify(topikGraphData));
      console.log('🔍 DEBUG - createTOPIKGraph function exists?', typeof createTOPIKGraph);
      
      let topikGraph = '';
      try {
        if (topikGraphData && topikGraphData.length > 0) {
          topikGraph = createTOPIKGraph(topikGraphData);
          console.log('🔍 DEBUG - Graph created successfully, length:', topikGraph ? topikGraph.length : 0);
          console.log('🔍 DEBUG - Graph contains SVG?', topikGraph.includes('<svg'));
          console.log('🔍 DEBUG - Graph first 200 chars:', topikGraph ? topikGraph.substring(0, 200) : 'empty');
        } else {
          console.log('🔍 DEBUG - No data for graph, using placeholder');
          topikGraph = '<div style="text-align: center; color: #999; padding: 40px;">TOPIK 시험 데이터가 없습니다</div>';
        }
      } catch (error) {
        console.error('🔍 ERROR creating graph:', error.message, error.stack);
        topikGraph = '<div style="color: red;">그래프 생성 오류: ' + error.message + '</div>';
      }
      
      console.log('🔍 DEBUG - Final topikGraph length:', topikGraph.length);
      
      // 강점/약점 리스트 생성
      const strengthList = (evaluationData?.strength_areas || academicData?.strength_areas) ? 
        (evaluationData?.strength_areas || academicData?.strength_areas).split(',').map(s => `<li>${s.trim()}</li>`).join('') : 
        '';
      
      const weaknessList = (evaluationData?.weakness_areas || academicData?.weakness_areas) ?
        (evaluationData?.weakness_areas || academicData?.weakness_areas).split(',').map(w => `<li>${w.trim()}</li>`).join('') :
        '';
      
      // 희망 대학 타임라인 생성 - 상담 기록에서 변경 이력 추출
      let universityChanges = [];
      
      // 상담 기록에서 대학 변경 정보 추출
      consultations.forEach(c => {
        // 상담 기록에서 직접 입력된 목표 대학/전공 정보 사용
        const university = c.target_university || c.desired_university || null;
        const major = c.target_major || c.desired_major || null;
        
        if (university || major) {
          universityChanges.push({
            date: c.consultation_date,
            university: university,
            major: major,
            notes: c.action_items || ''
          });
        }
      });
      
      // 현재 목표도 추가
      if (student?.target_university) {
        universityChanges.push({
          date: new Date(),
          university: student.target_university,
          major: student.target_major || '미정',
          notes: '현재 목표'
        });
      }
      
      // 중복 제거 및 날짜순 정렬
      universityChanges = universityChanges
        .filter((v, i, a) => a.findIndex(t => t.university === v.university && t.major === v.major) === i)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // 타임라인 SVG 생성
      const createUniversityTimeline = (changes) => {
        if (!changes || changes.length === 0) {
          return '';
        }
        
        const boxWidth = 160;
        const boxHeight = 60;
        const spacing = 30;
        const arrowLength = 25;
        const totalWidth = changes.length * boxWidth + (changes.length - 1) * spacing;
        const svgHeight = 100;
        
        let svg = `<svg width="100%" height="${svgHeight}" viewBox="0 0 ${totalWidth} ${svgHeight}" style="max-width: 100%; overflow-x: auto;">`;
        
        changes.forEach((change, index) => {
          const x = index * (boxWidth + spacing);
          const y = 20;
          
          // 박스 그리기
          const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444'];
          const color = colors[index % colors.length];
          
          svg += `
            <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" 
                  fill="${color}" rx="8" opacity="0.1"/>
            <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" 
                  stroke="${color}" stroke-width="2" fill="none" rx="8"/>
            <text x="${x + boxWidth/2}" y="${y + 25}" text-anchor="middle" 
                  font-size="14" font-weight="bold" fill="${color}">
              ${change.university || '미정'}
            </text>
            <text x="${x + boxWidth/2}" y="${y + 45}" text-anchor="middle" 
                  font-size="12" fill="#666">
              ${change.major || ''}
            </text>
            <text x="${x + boxWidth/2}" y="${y + 75}" text-anchor="middle" 
                  font-size="11" fill="#999">
              ${formatDate(change.date)}
            </text>`;
          
          // 화살표 그리기 (마지막 박스 제외)
          if (index < changes.length - 1) {
            const arrowX = x + boxWidth + 5;
            const arrowY = y + boxHeight/2;
            svg += `
              <line x1="${arrowX}" y1="${arrowY}" 
                    x2="${arrowX + arrowLength}" y2="${arrowY}" 
                    stroke="#999" stroke-width="2"/>
              <polygon points="${arrowX + arrowLength},${arrowY - 5} ${arrowX + arrowLength + 5},${arrowY} ${arrowX + arrowLength},${arrowY + 5}" 
                       fill="#999"/>`;
          }
        });
        
        svg += '</svg>';
        return svg;
      };
      
      const universityGoalsTimeline = createUniversityTimeline(universityChanges);
      
      // 상담 타임라인 생성 - 시각적 타임라인
      const createConsultationTimeline = (consultations) => {
        if (!consultations || consultations.length === 0) {
          return `<div style="text-align: center; color: #999; padding: 20px;">상담 기록이 없습니다.</div>`;
        }
        
        // 날짜순 정렬
        const sortedConsults = [...consultations].sort((a, b) => 
          new Date(a.consultation_date) - new Date(b.consultation_date)
        );
        
        let timeline = `<div style="position: relative; padding: 20px 0;">`;
        
        sortedConsults.forEach((consult, index) => {
          const isLeft = index % 2 === 0;
          const color = ['#6366F1', '#10B981', '#F59E0B'][index % 3];
          
          timeline += `
            <div style="display: flex; align-items: center; margin-bottom: 30px; 
                        ${isLeft ? '' : 'flex-direction: row-reverse;'}">
              
              <!-- 날짜 원 -->
              <div style="position: relative; z-index: 1;">
                <div style="width: 60px; height: 60px; background: white; border: 3px solid ${color}; 
                            border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                  <div style="text-align: center;">
                    <div style="font-size: 10px; color: #666;">
                      ${formatDate(consult.consultation_date).replace(/\. /g, '.').split('.')[0]}.${formatDate(consult.consultation_date).replace(/\. /g, '.').split('.')[1]}
                    </div>
                    <div style="font-size: 14px; font-weight: bold; color: ${color};">
                      ${formatDate(consult.consultation_date).replace(/\. /g, '.').split('.')[2] || ''}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 상담 내용 박스 -->
              <div style="flex: 1; ${isLeft ? 'margin-left: 20px;' : 'margin-right: 20px;'}">
                <div style="background: white; border: 1px solid ${color}; border-radius: 6px; 
                            padding: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <h4 style="color: ${color}; margin: 0; font-size: 12px;">
                      ${consult.consultation_type === 'video' ? '📹 화상 상담' : '👥 대면 상담'}
                    </h4>
                    <span style="color: #999; font-size: 10px;">
                      ${consult.teacher_name || consult.created_by_name || '상담사'}
                    </span>
                  </div>
                  <div style="color: #333; font-size: 11px; line-height: 1.4; margin-bottom: 0;">
                    ${(consult.content_ko || consult.notes || '상담 내용').substring(0, 100)}...
                  </div>
                </div>
              </div>
            </div>`;
        });
        
        timeline += `</div>`;
        return timeline;
      };
      
      const consultationTimeline = createConsultationTimeline(consultations);
      
      // 상담사 종합 평가 생성
      let counselorEvalSummary = '';
      if (consultations && consultations.length > 0) {
        const latestConsultation = consultations[0]; // 가장 최근 상담
        const counselorName = latestConsultation.counselor_name || latestConsultation.created_by_name || '담당 상담사';
        const totalConsultations = consultations.length;
        
        // 상담 내용 종합
        const improvements = consultations
          .filter(c => c.improvements)
          .map(c => c.improvements)
          .slice(0, 3)
          .join(', ') || '';
        
        const nextGoals = consultations
          .filter(c => c.next_goals)
          .map(c => c.next_goals)
          .slice(0, 3)
          .join(', ') || 'TOPIK 성적 향상 및 대학 진학 준비';
        
        counselorEvalSummary = `
          <div class="section">
            <div class="section-heading">
              <div class="section-icon">💬</div>
              <span>상담사 종합 평가</span>
            </div>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; border-left: 4px solid #2196f3;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                  <strong style="color: #555;">담당 상담사:</strong> ${counselorName}
                </div>
                <div>
                  <strong style="color: #555;">총 상담 횟수:</strong> ${totalConsultations}회
                </div>
                <div>
                  <strong style="color: #555;">최근 상담일:</strong> ${formatDate(latestConsultation.consultation_date)}
                </div>
                <div>
                  <strong style="color: #555;">상담 유형:</strong> ${latestConsultation.consultation_type || '정기 상담'}
                </div>
              </div>
              
              <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h5 style="color: #1976d2; margin-bottom: 10px; font-size: 14px;">🎯 개선 필요사항</h5>
                <p style="color: #333; line-height: 1.6; font-size: 13px;">
                  ${latestConsultation.improvements || improvements}
                </p>
              </div>
              
              <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h5 style="color: #1976d2; margin-bottom: 10px; font-size: 14px;">🚀 향후 목표</h5>
                <p style="color: #333; line-height: 1.6; font-size: 13px;">
                  ${latestConsultation.next_goals || nextGoals}
                </p>
              </div>
              
              <div style="background: #fff3e0; padding: 15px; border-radius: 8px; border: 1px solid #ffb74d;">
                <h5 style="color: #f57c00; margin-bottom: 10px; font-size: 14px;">✨ 상담사 종합 의견</h5>
                <p style="color: #333; line-height: 1.6; font-size: 13px; font-weight: 500;">
                  ${latestConsultation.counselor_evaluation || latestConsultation.counselor_comment || ''}
                </p>
              </div>
            </div>
          </div>`;
      } else {
        counselorEvalSummary = `
          <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <p style="color: #999; font-size: 14px;">상담 기록이 없습니다.</p>
          </div>`;
      }
      
      // 선생님 평가 종합 (최신 평가 기준)
      let teacherEvalSummary = '';
      if (teacherEvaluations && teacherEvaluations.length > 0) {
        const latestEval = teacherEvaluations[0];
        teacherEvalSummary = `
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h5 style="color: #333; margin-bottom: 10px;">최근 선생님 평가 (${formatDate(latestEval.evaluation_date)})</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div><strong>평가 교사:</strong> ${latestEval.teacher_name || '-'}</div>
              <div><strong>종합 평가:</strong> ${getRatingText(latestEval.overall_rating)}</div>
              <div><strong>출석률:</strong> ${latestEval.attendance_rate || 0}%</div>
              <div><strong>수업 참여도:</strong> ${latestEval.participation_grade || '-'}</div>
              <div><strong>한국어 능력:</strong> ${getRatingText(latestEval.korean_speaking)}</div>
              <div><strong>성장 가능성:</strong> ${latestEval.growth_potential === 'very_high' ? '매우 높음' : latestEval.growth_potential === 'high' ? '높음' : '보통'}</div>
            </div>
            ${latestEval.comprehensive_evaluation ? `<div style="margin-top: 10px;"><strong>종합 의견:</strong> ${latestEval.comprehensive_evaluation}</div>` : ''}
            ${latestEval.recommendation ? `<div style="margin-top: 10px;"><strong>추천사:</strong> ${latestEval.recommendation}</div>` : ''}
          </div>`;
      }
      
      // 학생 사진 처리
      let studentPhotoHTML = '학생 사진';
      if (student?.profile_image) {
        try {
          const imagePath = path.join(__dirname, '..', 'uploads', student.profile_image);
          if (await fs.access(imagePath).then(() => true).catch(() => false)) {
            const imageBuffer = await fs.readFile(imagePath);
            const base64Image = imageBuffer.toString('base64');
            const extension = path.extname(student.profile_image).toLowerCase();
            const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';
            studentPhotoHTML = `<img src="data:${mimeType};base64,${base64Image}" alt="학생 사진" />`;
          }
        } catch (error) {
          console.error('Error processing student photo:', error);
        }
      }
      
      // 플레이스홀더 치환 (전문 보고서용)
      console.log('🔍 DEBUG - topikGraph before replacements:', topikGraph ? topikGraph.length + ' chars' : 'undefined');
      console.log('🔍 DEBUG - topikGraph is SVG?', topikGraph && topikGraph.includes('<svg'));
      console.log('🎯 FINAL evaluationData before template replacement:');
      console.log('  - academic_evaluation:', evaluationData?.academic_evaluation ? `"${evaluationData.academic_evaluation.substring(0, 50)}..."` : '[EMPTY]');
      console.log('  - korean_evaluation:', evaluationData?.korean_evaluation ? `"${evaluationData.korean_evaluation.substring(0, 50)}..."` : '[EMPTY]');
      console.log('  - final_recommendation:', evaluationData?.final_recommendation ? `"${evaluationData.final_recommendation.substring(0, 50)}..."` : '[EMPTY]');
      console.log('  - strength_areas:', evaluationData?.strength_areas || '[EMPTY]');
      console.log('  - weakness_areas:', evaluationData?.weakness_areas || '[EMPTY]');
      console.log('  - student_opinion:', evaluationData?.student_opinion || '[EMPTY]');
      console.log('  - social_relationship:', evaluationData?.social_relationship || '[EMPTY]');
      console.log('  - class_attitude:', evaluationData?.class_attitude || '[EMPTY]');
      console.log('  - adaptation_level:', evaluationData?.adaptation_level || '[EMPTY]');
      console.log('  - growth_potential:', evaluationData?.growth_potential || '[EMPTY]');
      
      const replacements = {
        '{{agency_name}}': student?.agency || '베트남 유학원',
        '{{student_name_ko}}': student?.name_ko || student?.name || '학생 이름',
        '{{student_name_vi}}': student?.name_vi || '',
        '{{student_code}}': student?.student_code || '',
        '{{student_photo}}': studentPhotoHTML,
        '{{report_date}}': formatDate(new Date()),
        '{{attendance_rate}}': evaluationData?.attendance_rate || academicData?.attendance_rate || '',
        '{{topik_level}}': examResults?.[0]?.level || '',
        '{{topik_total}}': examResults?.[0]?.total_score || '',
        '{{document_number}}': `DOC-${Date.now()}`,
        '{{topik_score_table}}': topikScoreTable,
        '{{topik_graph}}': topikGraph,
        '{{participation_grade}}': evaluationData?.participation_grade || academicData?.participation_grade || '',
        '{{vocabulary_known}}': evaluationData?.vocabulary_known || academicData?.vocabulary_known || '',
        '{{strength_list}}': strengthList,
        '{{weakness_list}}': weaknessList,
        '{{university_goals_timeline}}': universityGoalsTimeline,
        '{{consultation_timeline}}': consultationTimeline,
        '{{club_activities}}': portfolioData?.club_activities || '',
        '{{volunteer_activities}}': portfolioData?.volunteer_activities || '',
        '{{awards}}': portfolioData?.awards || '',
        '{{portfolio_status}}': portfolioData?.portfolio_status || '',
        '{{student_opinion}}': evaluationData?.student_opinion || portfolioData?.student_opinion || '',
        '{{social_rating_stars}}': ratingToStars(evaluationData?.social_rating),
        '{{social_relationship}}': evaluationData?.social_relationship || '',
        '{{attitude_rating_stars}}': ratingToStars(evaluationData?.attitude_rating),
        '{{class_attitude}}': evaluationData?.class_attitude || '',
        '{{adaptation_rating_stars}}': ratingToStars(evaluationData?.adaptation_rating),
        '{{adaptation_level}}': evaluationData?.adaptation_level || '',
        '{{growth_rating_stars}}': ratingToStars(evaluationData?.growth_rating),
        '{{growth_potential}}': evaluationData?.growth_potential || '',
        '{{academic_evaluation}}': evaluationData?.academic_evaluation || '',
        '{{korean_evaluation}}': evaluationData?.korean_evaluation || '',
        '{{final_recommendation}}': evaluationData?.final_recommendation || '',
        '{{counselor_name}}': consultations?.[0]?.counselor_name || consultations?.[0]?.created_by_name || '담당 상담사',
        '{{teacher_evaluation_summary}}': teacherEvalSummary, // 선생님 평가 종합 추가
        '{{counselor_evaluation_summary}}': counselorEvalSummary // 상담사 종합 평가 추가
      };
      
      // 템플릿의 모든 플레이스홀더 치환
      console.log('🔍 DEBUG - Starting replacements...');
      console.log('🔍 DEBUG - {{topik_graph}} in replacements?', '{{topik_graph}}' in replacements);
      console.log('🔍 DEBUG - replacements[{{topik_graph}}] value:', replacements['{{topik_graph}}'] ? replacements['{{topik_graph}}'].substring(0, 100) : 'undefined');
      
      // 핵심 평가 데이터 디버깅
      console.log('⚡ CRITICAL DEBUG - Academic Evaluation Replacement:');
      console.log('  - {{academic_evaluation}} value:', replacements['{{academic_evaluation}}']);
      console.log('  - {{korean_evaluation}} value:', replacements['{{korean_evaluation}}']);
      console.log('  - {{final_recommendation}} value:', replacements['{{final_recommendation}}']);
      
      for (const [placeholder, value] of Object.entries(replacements)) {
        if (placeholder === '{{topik_graph}}') {
          console.log('🔍 DEBUG - Replacing {{topik_graph}}, value length:', value ? value.length : 0);
        }
        if (placeholder.includes('evaluation') || placeholder.includes('recommendation')) {
          console.log(`🌟 Replacing ${placeholder} with: ${value ? value.substring(0, 50) + '...' : 'DEFAULT VALUE'}`);
        }
        // 특수 문자를 이스케이프하여 정규표현식 생성
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        htmlTemplate = htmlTemplate.replace(new RegExp(escapedPlaceholder, 'g'), value || '');
      }
      
      // 치환 후 확인
      console.log('🔍 DEBUG - After replacements, {{topik_graph}} still exists?', htmlTemplate.includes('{{topik_graph}}'));
      console.log('🔍 DEBUG - SVG tag exists in final HTML?', htmlTemplate.includes('<svg'));
      
      return htmlTemplate;
      
    } catch (error) {
      console.error('Error generating HTML from template:', error);
      throw error;
    }
  }

  // PDF 생성 메인 메소드
  async generateReport(studentId, templateCode = 'consultation_comprehensive', dateRange = {}, userId = null, language = 'ko') {
    try {
      console.log('📊 Starting report generation for student:', studentId);
      
      // 1. HTML 생성 (템플릿 사용)
      const htmlContent = await this.generateHTMLFromTemplate(studentId, language);
      
      // 2. 디렉토리 생성
      const uploadDir = path.join(__dirname, '..', 'uploads', 'reports');
      await fs.mkdir(uploadDir, { recursive: true });
      
      // 3. HTML 파일 저장
      const timestamp = Date.now();
      const htmlFileName = `report_${studentId}_${templateCode}_${timestamp}.html`;
      const htmlPath = path.join(uploadDir, htmlFileName);
      await fs.writeFile(htmlPath, htmlContent, 'utf8');
      const htmlRelativePath = path.join('uploads', 'reports', htmlFileName);
      
      // 4. PDF 생성
      console.log('🖨️ Converting HTML to PDF...');
      const startTime = Date.now();
      const enhancedHTML = pdfService.enhanceHTMLForPDF(htmlContent, language);
      const pdfBuffer = await pdfService.generatePDFFromHTML(enhancedHTML);
      
      // 5. PDF 파일 저장
      const pdfFileName = `report_${studentId}_${templateCode}_${timestamp}.pdf`;
      const pdfPath = path.join(uploadDir, pdfFileName);
      await fs.writeFile(pdfPath, pdfBuffer);
      const pdfRelativePath = path.join('uploads', 'reports', pdfFileName);
      
      const generationTime = Date.now() - startTime;
      console.log(`✅ PDF generated in ${generationTime}ms`);
      
      // 6. 데이터베이스에 기록
      const student = await this.getStudentInfo(studentId);
      const insertResult = await db('generated_reports').insert({
        student_id: studentId,
        template_id: 1,
        report_title: `${student?.name_ko || '학생'} - 종합 보고서`,
        report_date: new Date().toISOString().split('T')[0],
        period_start: dateRange.start || null,
        period_end: dateRange.end || null,
        status: 'completed',
        pdf_path: pdfRelativePath.replace(/\\/g, '/'),
        html_path: htmlRelativePath.replace(/\\/g, '/'),
        file_size: pdfBuffer.length,
        generation_time_ms: generationTime,
        generated_by: userId,
        generated_at: new Date(),
        access_count: 0
      }).returning('report_id');
      
      const reportId = insertResult[0]?.report_id || insertResult[0];
      
      return {
        report_id: reportId,
        pdf_path: pdfRelativePath,
        html_path: htmlRelativePath,
        generation_time: generationTime
      };
      
    } catch (error) {
      console.error('❌ Error generating report:', error);
      console.error('Error stack:', error.stack);
      
      // 실패한 경우에도 데이터베이스에 기록 시도
      try {
        await db('generated_reports').insert({
          student_id: studentId,
          template_id: 1,
          report_title: `Failed Report - Student ${studentId}`,
          report_date: new Date().toISOString().split('T')[0],
          status: 'failed',
          error_message: error.message,
          generated_by: userId,
          generated_at: new Date()
        });
      } catch (dbError) {
        console.error('❌ Failed to record error in database:', dbError);
      }
      
      throw error;
    }
  }
}

module.exports = new EnhancedReportService();