-- 학생 테이블에 사진 URL 추가
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMP;

-- 학습 메트릭스 테이블 생성
CREATE TABLE IF NOT EXISTS learning_metrics (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- 기간 정보
    metric_date DATE NOT NULL,
    metric_month VARCHAR(7), -- YYYY-MM 형식
    
    -- 출석 정보
    attendance_rate DECIMAL(5,2), -- 출석률 (0-100)
    total_class_days INTEGER DEFAULT 0,
    attended_days INTEGER DEFAULT 0,
    
    -- 수업 참여도 (1-5 척도)
    class_participation INTEGER CHECK (class_participation >= 1 AND class_participation <= 5),
    participation_notes TEXT,
    
    -- 단어 학습도
    vocabulary_progress DECIMAL(5,2), -- 진도율 (0-100)
    target_words INTEGER DEFAULT 0,
    learned_words INTEGER DEFAULT 0,
    vocabulary_test_score DECIMAL(5,2), -- 단어 시험 점수
    
    -- 종합 평가
    overall_score DECIMAL(5,2), -- 종합 점수 (0-100)
    teacher_comment TEXT,
    
    -- 메타데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    
    UNIQUE(student_id, metric_date)
);

-- 특별활동 테이블 생성
CREATE TABLE IF NOT EXISTS special_activities (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- 활동 정보
    activity_type VARCHAR(50) NOT NULL, -- club, volunteer, award, portfolio, other
    activity_name VARCHAR(200) NOT NULL,
    activity_name_vi VARCHAR(200), -- 베트남어 활동명
    
    -- 상세 정보
    start_date DATE,
    end_date DATE,
    is_ongoing BOOLEAN DEFAULT false,
    
    -- 활동 내용
    description TEXT,
    description_vi TEXT, -- 베트남어 설명
    achievement TEXT, -- 성과나 수상 내역
    
    -- 증빙 자료
    document_url VARCHAR(500),
    certificate_url VARCHAR(500),
    
    -- 평가
    hours_participated INTEGER, -- 참여 시간
    teacher_evaluation TEXT,
    impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 5), -- 영향력 점수
    
    -- 메타데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- 생활 및 인성평가 테이블 생성
CREATE TABLE IF NOT EXISTS character_evaluations (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- 평가 기간
    evaluation_date DATE NOT NULL,
    evaluation_period VARCHAR(20), -- 2024-1학기, 2024-2학기 등
    
    -- 교우 관계 (1-5 척도)
    social_relationship INTEGER CHECK (social_relationship >= 1 AND social_relationship <= 5),
    social_notes TEXT,
    
    -- 수업 태도 (1-5 척도)
    class_attitude INTEGER CHECK (class_attitude >= 1 AND class_attitude <= 5),
    attitude_notes TEXT,
    
    -- 한국 생활 적응도 (1-5 척도)
    korea_adaptation INTEGER CHECK (korea_adaptation >= 1 AND korea_adaptation <= 5),
    adaptation_notes TEXT,
    
    -- 성장 가능성 (1-5 척도)
    growth_potential INTEGER CHECK (growth_potential >= 1 AND growth_potential <= 5),
    growth_notes TEXT,
    
    -- 추가 평가 항목
    leadership INTEGER CHECK (leadership >= 1 AND leadership <= 5), -- 리더십
    responsibility INTEGER CHECK (responsibility >= 1 AND responsibility <= 5), -- 책임감
    creativity INTEGER CHECK (creativity >= 1 AND creativity <= 5), -- 창의성
    communication INTEGER CHECK (communication >= 1 AND communication <= 5), -- 의사소통
    
    -- 종합 평가
    overall_character_score DECIMAL(5,2), -- 전체 인성 점수 (평균)
    strengths TEXT, -- 강점
    improvement_areas TEXT, -- 개선점
    counselor_opinion TEXT, -- 상담사 의견
    teacher_opinion TEXT, -- 교사 의견
    
    -- 메타데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evaluated_by INTEGER REFERENCES users(id),
    
    UNIQUE(student_id, evaluation_date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_learning_metrics_student ON learning_metrics(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_metrics_date ON learning_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_special_activities_student ON special_activities(student_id);
CREATE INDEX IF NOT EXISTS idx_special_activities_type ON special_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_character_evaluations_student ON character_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_character_evaluations_date ON character_evaluations(evaluation_date);

-- 뷰 생성: 학생별 최신 학습 메트릭스
CREATE OR REPLACE VIEW latest_learning_metrics AS
SELECT DISTINCT ON (student_id) 
    lm.*,
    s.name_ko,
    s.name_vi
FROM learning_metrics lm
JOIN students s ON lm.student_id = s.id
ORDER BY student_id, metric_date DESC;

-- 뷰 생성: 학생별 평균 학습 성과
CREATE OR REPLACE VIEW student_learning_summary AS
SELECT 
    student_id,
    s.name_ko,
    s.name_vi,
    AVG(attendance_rate) as avg_attendance,
    AVG(class_participation) as avg_participation,
    AVG(vocabulary_progress) as avg_vocabulary,
    AVG(overall_score) as avg_overall_score,
    COUNT(*) as total_records
FROM learning_metrics lm
JOIN students s ON lm.student_id = s.id
GROUP BY student_id, s.name_ko, s.name_vi;

-- 뷰 생성: 학생별 특별활동 요약
CREATE OR REPLACE VIEW student_activities_summary AS
SELECT 
    student_id,
    s.name_ko,
    s.name_vi,
    COUNT(CASE WHEN activity_type = 'club' THEN 1 END) as club_count,
    COUNT(CASE WHEN activity_type = 'volunteer' THEN 1 END) as volunteer_count,
    COUNT(CASE WHEN activity_type = 'award' THEN 1 END) as award_count,
    COUNT(CASE WHEN activity_type = 'portfolio' THEN 1 END) as portfolio_count,
    SUM(hours_participated) as total_hours,
    AVG(impact_score) as avg_impact
FROM special_activities sa
JOIN students s ON sa.student_id = s.id
GROUP BY student_id, s.name_ko, s.name_vi;