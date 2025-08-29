const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiAIService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ Gemini API key not found. AI features will be limited.');
      this.enabled = false;
      return;
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.enabled = true;
    console.log('✅ Gemini AI Service initialized');
  }

  /**
   * 하이브리드 방식: AI 보조 분석 + 교사 입력
   */
  async generateHybridAnalysis(studentData, teacherInput = {}) {
    if (!this.enabled) {
      return this.getFallbackAnalysis(studentData, teacherInput);
    }

    try {
      // 교사가 입력한 핵심 평가는 그대로 사용
      const result = {
        // 교사 직접 입력 부분
        academic_evaluation: teacherInput.academic_evaluation || '교사 평가 대기',
        korean_evaluation: teacherInput.korean_evaluation || '교사 평가 대기',
        adaptation_evaluation: teacherInput.adaptation_evaluation || '교사 평가 대기',
        
        // AI 보조 분석 부분
        learning_suggestion: '',
        growth_prediction: '',
        strength_analysis: ''
      };

      // AI 보조 분석 요청
      const prompt = `
        학생 정보 분석:
        - 이름: ${studentData.student_name_ko}
        - TOPIK 등급: ${studentData.topik_level || '미응시'}
        - 최근 점수: 읽기 ${studentData.topik_reading || 0}, 듣기 ${studentData.topik_listening || 0}
        - 출석률: ${studentData.attendance_rate || 0}%
        - 학습 기간: ${studentData.study_months || 0}개월
        
        다음 항목에 대해 간단하고 구체적인 분석을 제공해주세요:
        1. 학습 전략 제안 (2-3문장)
        2. 향후 성장 예측 (1-2문장)
        3. 강점 분야 (1-2문장)
        
        형식: JSON
        {
          "learning_suggestion": "...",
          "growth_prediction": "...", 
          "strength_analysis": "..."
        }
      `;

      const aiResult = await this.model.generateContent(prompt);
      const response = aiResult.response.text();
      
      // JSON 파싱 시도
      try {
        const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
        result.learning_suggestion = parsed.learning_suggestion || '';
        result.growth_prediction = parsed.growth_prediction || '';
        result.strength_analysis = parsed.strength_analysis || '';
      } catch (e) {
        // JSON 파싱 실패시 텍스트 그대로 사용
        result.learning_suggestion = response;
      }

      return result;
    } catch (error) {
      console.error('❌ Gemini AI error:', error.message);
      return this.getFallbackAnalysis(studentData, teacherInput);
    }
  }

  /**
   * AI 사용 불가시 대체 분석
   */
  getFallbackAnalysis(studentData, teacherInput) {
    const topikLevel = studentData.topik_level || 0;
    const attendanceRate = studentData.attendance_rate || 0;
    
    return {
      // 교사 입력 유지
      academic_evaluation: teacherInput.academic_evaluation || '교사 평가 필요',
      korean_evaluation: teacherInput.korean_evaluation || '교사 평가 필요',
      adaptation_evaluation: teacherInput.adaptation_evaluation || '교사 평가 필요',
      
      // 기본 분석
      learning_suggestion: this.getBasicSuggestion(topikLevel, attendanceRate),
      growth_prediction: this.getBasicPrediction(topikLevel),
      strength_analysis: this.getBasicStrength(studentData)
    };
  }

  getBasicSuggestion(level, attendance) {
    if (level <= 2) {
      return '기초 어휘와 문법 학습에 집중하며, 일상 회화 연습을 늘리는 것을 추천합니다.';
    } else if (level <= 4) {
      return '읽기와 쓰기 영역을 균형있게 학습하고, 전공 관련 어휘를 확대하는 것이 필요합니다.';
    } else {
      return '대학 수업에 필요한 학술적 표현과 논문 작성 능력을 향상시키는 것을 권장합니다.';
    }
  }

  getBasicPrediction(level) {
    if (level <= 2) {
      return '꾸준한 학습 시 6개월 내 3급 달성 가능';
    } else if (level <= 4) {
      return '현재 속도 유지 시 대학 입학 전 5급 달성 예상';
    } else {
      return '대학 수업 수강에 충분한 한국어 능력 보유';
    }
  }

  getBasicStrength(data) {
    const strengths = [];
    if (data.attendance_rate >= 90) strengths.push('우수한 출석률');
    if (data.topik_reading > data.topik_listening) strengths.push('읽기 영역');
    else if (data.topik_listening > data.topik_reading) strengths.push('듣기 영역');
    
    return strengths.length > 0 ? strengths.join(', ') : '균형잡힌 학습 능력';
  }

  /**
   * TOPIK 점수 예측 (단순 선형 회귀)
   */
  predictTopikScore(scores) {
    if (!scores || scores.length < 2) {
      return { next_prediction: null, confidence: 'low' };
    }

    // 단순 선형 회귀로 다음 점수 예측
    const n = scores.length;
    const x = scores.map((_, i) => i + 1);
    const y = scores.map(s => s.total_score);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const nextScore = Math.round(slope * (n + 1) + intercept);
    const confidence = Math.abs(slope) > 5 ? 'high' : Math.abs(slope) > 2 ? 'medium' : 'low';
    
    return {
      next_prediction: Math.min(200, Math.max(0, nextScore)),
      confidence,
      trend: slope > 5 ? '빠른 향상' : slope > 0 ? '점진적 향상' : '정체'
    };
  }
}

module.exports = new GeminiAIService();