/**
 * 학생 생활기록부 자동 생성 서비스
 * TOPIK 점수 데이터를 활용한 풍부한 서술형 평가 자동 생성
 */

const db = require('../config/database');

class StudentRecordGenerator {
  /**
   * TOPIK 점수 변화 패턴 분석
   */
  analyzeScorePattern(scores) {
    if (!scores || scores.length < 2) {
      return {
        trend: 'insufficient_data',
        pattern: '데이터 부족',
        description: '아직 충분한 데이터가 없습니다.'
      };
    }

    // 최근 3개 시험의 추이 분석
    const recentScores = scores.slice(0, 3).reverse();
    const trends = [];
    
    for (let i = 1; i < recentScores.length; i++) {
      const diff = recentScores[i].total - recentScores[i-1].total;
      trends.push(diff);
    }

    const avgTrend = trends.reduce((a, b) => a + b, 0) / trends.length;
    
    if (avgTrend > 10) {
      return {
        trend: 'rapid_improvement',
        pattern: '급격한 향상',
        description: '최근 시험에서 매우 빠른 성장세를 보이고 있습니다.'
      };
    } else if (avgTrend > 5) {
      return {
        trend: 'steady_improvement',
        pattern: '꾸준한 향상',
        description: '안정적이고 지속적인 학습 성과를 보여주고 있습니다.'
      };
    } else if (avgTrend > 0) {
      return {
        trend: 'gradual_improvement',
        pattern: '점진적 향상',
        description: '천천히 그러나 확실하게 실력이 향상되고 있습니다.'
      };
    } else if (avgTrend === 0) {
      return {
        trend: 'stable',
        pattern: '안정적 유지',
        description: '일정한 수준을 안정적으로 유지하고 있습니다.'
      };
    } else {
      return {
        trend: 'needs_support',
        pattern: '추가 지원 필요',
        description: '학습 방법 개선이나 추가적인 지원이 필요해 보입니다.'
      };
    }
  }

  /**
   * 영역별 강점/약점 분석
   */
  analyzeStrengthsWeaknesses(scores) {
    const latest = scores[0];
    if (!latest || !latest.detailed_scores) return null;

    const details = typeof latest.detailed_scores === 'string' 
      ? JSON.parse(latest.detailed_scores) 
      : latest.detailed_scores;

    const listening = details.listening || 0;
    const reading = details.reading || 0;
    const writing = details.writing || 0;

    const strengths = [];
    const weaknesses = [];
    const avg = (listening + reading + writing) / 3;

    if (listening > avg + 5) strengths.push('듣기');
    else if (listening < avg - 5) weaknesses.push('듣기');

    if (reading > avg + 5) strengths.push('읽기');
    else if (reading < avg - 5) weaknesses.push('읽기');

    if (writing > 0) {
      if (writing > avg + 5) strengths.push('쓰기');
      else if (writing < avg - 5) weaknesses.push('쓰기');
    }

    return {
      strengths: strengths.length > 0 ? strengths : ['균형잡힌 실력'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['특별한 약점 없음'],
      balanced: strengths.length === 0 && weaknesses.length === 0
    };
  }

  /**
   * 학습 태도 서술문 생성
   */
  generateAttitudeNarrative(student, scores, attendance) {
    const pattern = this.analyzeScorePattern(scores);
    const strengths = this.analyzeStrengthsWeaknesses(scores);
    
    const narratives = {
      rapid_improvement: `${student.name_ko} 학생은 탁월한 학습 능력과 노력으로 단기간에 놀라운 성장을 보여주었습니다. 
        특히 ${strengths?.strengths.join(', ')} 영역에서 두각을 나타내며, 자기주도적 학습 태도가 매우 우수합니다. 
        수업 참여도가 높고 동료 학생들과의 협력 학습에도 적극적으로 참여하여 긍정적인 학습 분위기 조성에 기여하고 있습니다.`,
      
      steady_improvement: `${student.name_ko} 학생은 꾸준하고 성실한 학습 태도로 지속적인 성장을 이루어내고 있습니다. 
        ${pattern.description} 특히 ${strengths?.strengths.join(', ')} 영역에서 강점을 보이며, 
        학습 목표를 명확히 설정하고 체계적으로 접근하는 모습이 인상적입니다.`,
      
      gradual_improvement: `${student.name_ko} 학생은 차분하고 신중한 학습 태도로 착실히 실력을 쌓아가고 있습니다. 
        급하지 않게 기초를 다지며 학습하는 모습이 돋보이며, ${strengths?.strengths.join(', ')} 영역에서 
        특별한 재능을 보이고 있습니다. 꾸준한 노력이 곧 큰 성과로 이어질 것으로 기대됩니다.`,
      
      stable: `${student.name_ko} 학생은 안정적인 학습 능력을 유지하며 꾸준히 노력하고 있습니다. 
        ${strengths?.balanced ? '전 영역에서 균형잡힌 실력을 보유하고 있으며' : strengths?.strengths.join(', ') + ' 영역이 특히 우수하며'}, 
        수업 태도가 모범적입니다. 더 높은 목표를 설정하여 도전한다면 더 큰 성장이 기대됩니다.`,
      
      needs_support: `${student.name_ko} 학생은 학습에 대한 의욕과 열정을 가지고 있으나, 
        효과적인 학습 전략 수립에 도움이 필요해 보입니다. ${strengths?.strengths.join(', ')} 영역에서는 
        잠재력을 보이고 있으므로, 맞춤형 학습 지원을 통해 충분히 향상될 수 있을 것으로 판단됩니다.`,
      
      insufficient_data: `${student.name_ko} 학생은 성실하게 학습에 임하고 있으며, 
        한국어 학습에 대한 열의가 높습니다. 앞으로의 성장이 기대되는 학생입니다.`
    };

    return narratives[pattern.trend] || narratives.insufficient_data;
  }

  /**
   * 성장 스토리 생성
   */
  generateGrowthStory(student, scores) {
    if (!scores || scores.length === 0) {
      return '학생은 현재 한국어 학습을 시작한 단계이며, 앞으로의 성장이 기대됩니다.';
    }

    const firstScore = scores[scores.length - 1];
    const latestScore = scores[0];
    const totalImprovement = latestScore.score - firstScore.score;
    
    // 회차별 성장 스토리 생성
    const milestones = [];
    
    scores.reverse().forEach((score, index) => {
      if (index === 0) return;
      
      const prevScore = scores[index - 1];
      const improvement = score.score - prevScore.score;
      
      if (improvement > 20) {
        milestones.push(`${score.test_number}회차에서 큰 도약을 이루어`);
      } else if (improvement > 10) {
        milestones.push(`${score.test_number}회차에서 눈에 띄는 향상을 보여`);
      } else if (improvement > 0) {
        milestones.push(`${score.test_number}회차에서 꾸준한 발전을 이어가며`);
      }
    });

    let story = `${student.name_ko} 학생은 `;
    
    if (totalImprovement > 30) {
      story += `처음 ${firstScore.test_number}회차 ${firstScore.score}점에서 시작하여 
        현재 ${latestScore.test_number}회차 ${latestScore.score}점까지 총 ${totalImprovement}점이라는 
        놀라운 성장을 이루었습니다. `;
    } else if (totalImprovement > 15) {
      story += `${firstScore.test_number}회차부터 ${latestScore.test_number}회차까지 
        ${totalImprovement}점의 안정적인 향상을 보였습니다. `;
    } else {
      story += `꾸준히 학습하며 실력을 유지하고 있습니다. `;
    }

    if (milestones.length > 0) {
      story += `특히 ${milestones.join(', ')} 인상적인 학습 곡선을 그렸습니다.`;
    }

    return story;
  }

  /**
   * 학습 전략 및 개선 제안 생성
   */
  generateLearningStrategy(scores) {
    const analysis = this.analyzeStrengthsWeaknesses(scores);
    
    if (!analysis) {
      return '기초부터 차근차근 학습하며, 모든 영역을 균형있게 발전시켜 나가는 것이 중요합니다.';
    }

    let strategy = '';
    
    if (analysis.balanced) {
      strategy = '현재 모든 영역에서 균형잡힌 실력을 보유하고 있으므로, 전체적인 수준을 한 단계 높이는 심화 학습이 필요합니다. ';
    } else {
      if (analysis.strengths.length > 0 && analysis.strengths[0] !== '균형잡힌 실력') {
        strategy += `강점인 ${analysis.strengths.join(', ')} 영역을 더욱 발전시키면서, `;
      }
      
      if (analysis.weaknesses.length > 0 && analysis.weaknesses[0] !== '특별한 약점 없음') {
        strategy += `${analysis.weaknesses.join(', ')} 영역을 집중적으로 보완하는 학습 전략이 필요합니다. `;
      }
    }

    // 구체적인 학습 방법 제안
    const latest = scores[0];
    const details = typeof latest.detailed_scores === 'string' 
      ? JSON.parse(latest.detailed_scores) 
      : latest.detailed_scores;

    if (details.listening < 60) {
      strategy += '듣기 실력 향상을 위해 한국 드라마나 뉴스를 활용한 실전 연습을 권장합니다. ';
    }
    if (details.reading < 60) {
      strategy += '읽기 능력 강화를 위해 다양한 장르의 한국어 텍스트를 접하는 것이 도움이 될 것입니다. ';
    }
    if (details.writing && details.writing < 60) {
      strategy += '쓰기 실력 향상을 위해 일기 쓰기나 에세이 작성 연습을 추천합니다. ';
    }

    return strategy;
  }

  /**
   * TOPIK 점수 기반 단어 수준 계산
   */
  calculateVocabularyLevel(topikScore) {
    // TOPIK 점수별 예상 단어 수준 (1000단어 기준)
    if (topikScore >= 180) {
      return {
        known: 950,  // 6급: 거의 모든 단어
        level: 6,
        percentage: 95
      };
    } else if (topikScore >= 150) {
      return {
        known: 850,  // 5급: 850/1000
        level: 5,
        percentage: 85
      };
    } else if (topikScore >= 120) {
      return {
        known: 700,  // 4급: 700/1000
        level: 4,
        percentage: 70
      };
    } else if (topikScore >= 90) {
      return {
        known: 550,  // 3급: 550/1000
        level: 3,
        percentage: 55
      };
    } else if (topikScore >= 60) {
      return {
        known: 350,  // 2급: 350/1000
        level: 2,
        percentage: 35
      };
    } else if (topikScore >= 30) {
      return {
        known: 200,  // 1급: 200/1000
        level: 1,
        percentage: 20
      };
    } else {
      return {
        known: 100,  // 초급: 100/1000
        level: 0,
        percentage: 10
      };
    }
  }

  /**
   * 종합 생활기록부 생성
   */
  async generateComprehensiveRecord(studentId) {
    try {
      // 학생 정보 조회
      const student = await db('students')
        .where('student_id', studentId)
        .first();

      if (!student) {
        throw new Error('Student not found');
      }

      // TOPIK 점수 이력 조회
      const scores = await db('exam_results')
        .where({
          student_id: studentId,
          exam_type: 'mock'
        })
        .whereRaw("exam_name LIKE '%TOPIK%'")
        .orderBy('exam_date', 'desc');

      // 출석률 및 상담 기록 조회
      const consultations = await db('consultations')
        .where('student_id', studentId)
        .orderBy('consultation_date', 'desc');

      // 단어 수준 계산
      const latestScore = scores[0] ? scores[0].score : 0;
      const vocabularyProgress = this.calculateVocabularyLevel(latestScore);

      // 자동 생성 컨텐츠
      const record = {
        // 기본 정보
        student_info: {
          name_ko: student.name_ko,
          name_vi: student.name_vi,
          student_code: student.student_code,
          enrollment_date: student.created_at
        },

        // 학습 태도 평가 (자동 생성)
        attitude_evaluation: this.generateAttitudeNarrative(student, scores, 92),

        // 성장 스토리 (자동 생성)
        growth_story: this.generateGrowthStory(student, scores),

        // 학습 전략 (자동 생성)
        learning_strategy: this.generateLearningStrategy(scores),

        // 단어 학습 진도 추가
        vocabulary_progress: {
          known_words: vocabularyProgress.known,
          total_words: 1000,
          percentage: vocabularyProgress.percentage,
          level_description: `TOPIK ${vocabularyProgress.level}급 수준의 어휘력을 보유하고 있으며, 필수 1000단어 중 약 ${vocabularyProgress.known}단어를 습득했습니다.`
        },

        // TOPIK 분석
        topik_analysis: {
          pattern: this.analyzeScorePattern(scores),
          strengths_weaknesses: this.analyzeStrengthsWeaknesses(scores),
          latest_score: scores[0] || null,
          total_tests: scores.length,
          average_score: scores.length > 0 
            ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
            : 0
        },

        // 상담 요약
        consultation_summary: {
          total_count: consultations.length,
          recent_consultation: consultations[0] || null,
          key_improvements: this.extractKeyImprovements(consultations)
        },

        // 추천사 (자동 생성)
        recommendation: this.generateRecommendation(student, scores, consultations),

        // 특별 활동 및 성과
        special_achievements: this.generateAchievements(scores),

        // 생성 일시
        generated_at: new Date()
      };

      return record;

    } catch (error) {
      console.error('Error generating comprehensive record:', error);
      throw error;
    }
  }

  /**
   * 주요 개선사항 추출
   */
  extractKeyImprovements(consultations) {
    const improvements = [];
    
    consultations.slice(0, 5).forEach(consultation => {
      if (consultation.action_items) {
        try {
          const items = typeof consultation.action_items === 'string'
            ? JSON.parse(consultation.action_items)
            : consultation.action_items;
          
          if (items.improvements) {
            improvements.push({
              date: consultation.consultation_date,
              content: items.improvements
            });
          }
        } catch (e) {
          // 파싱 실패 시 무시
        }
      }
    });

    return improvements;
  }

  /**
   * 추천사 생성
   */
  generateRecommendation(student, scores, consultations) {
    const pattern = this.analyzeScorePattern(scores);
    const latestScore = scores[0];
    
    let recommendation = `${student.name_ko} 학생은 `;

    // 성적 기반 평가
    if (latestScore && latestScore.score >= 140) {
      recommendation += '매우 우수한 한국어 실력을 보유하고 있으며, 한국 대학 수업을 충분히 따라갈 수 있는 수준입니다. ';
    } else if (latestScore && latestScore.score >= 100) {
      recommendation += '안정적인 한국어 실력을 갖추고 있으며, 대학 진학 후 빠른 적응이 예상됩니다. ';
    } else {
      recommendation += '꾸준히 한국어 실력을 향상시키고 있으며, 성실한 학습 태도가 돋보입니다. ';
    }

    // 태도 기반 평가
    if (consultations.length >= 10) {
      recommendation += '정기적인 상담을 통해 지속적으로 자기 개발에 힘쓰고 있으며, ';
    }

    // 성장 패턴 기반 평가
    if (pattern.trend === 'rapid_improvement' || pattern.trend === 'steady_improvement') {
      recommendation += '뛰어난 학습 능력과 발전 가능성을 보여주고 있습니다. ';
    }

    recommendation += '본 학생의 한국 유학을 적극 추천합니다.';

    return recommendation;
  }

  /**
   * 특별 성과 생성
   */
  generateAchievements(scores) {
    const achievements = [];

    scores.forEach((score, index) => {
      // 첫 TOPIK 응시
      if (index === scores.length - 1) {
        achievements.push({
          date: score.exam_date,
          achievement: `첫 TOPIK 모의고사 응시 (${score.score}점)`
        });
      }

      // 100점 돌파
      if (score.score >= 100 && (index === scores.length - 1 || scores[index + 1].score < 100)) {
        achievements.push({
          date: score.exam_date,
          achievement: 'TOPIK 100점 돌파 달성'
        });
      }

      // 140점 돌파 (2급 안정권)
      if (score.score >= 140 && (index === scores.length - 1 || scores[index + 1].score < 140)) {
        achievements.push({
          date: score.exam_date,
          achievement: 'TOPIK 2급 안정권 진입 (140점 이상)'
        });
      }

      // 개인 최고점 갱신
      const previousScores = scores.slice(index + 1);
      if (previousScores.length > 0) {
        const maxPrevious = Math.max(...previousScores.map(s => s.score));
        if (score.score > maxPrevious) {
          achievements.push({
            date: score.exam_date,
            achievement: `개인 최고점 갱신 (${score.score}점)`
          });
        }
      }
    });

    return achievements;
  }
}

module.exports = new StudentRecordGenerator();