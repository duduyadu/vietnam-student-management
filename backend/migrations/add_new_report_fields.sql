-- 학생 테이블에 신규 필드 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS high_school_gpa DECIMAL(5,2);
ALTER TABLE students ADD COLUMN IF NOT EXISTS financial_sponsor VARCHAR(100) DEFAULT '부모';
ALTER TABLE students ADD COLUMN IF NOT EXISTS bank_statement_status VARCHAR(50) DEFAULT '준비중';
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name_ko VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS club_activities TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS volunteer_activities TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS awards TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS portfolio_status VARCHAR(50) DEFAULT '미준비';

-- 학생 희망 대학 이력 테이블
CREATE TABLE IF NOT EXISTS student_goals (
    goal_id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(student_id) ON DELETE CASCADE,
    university VARCHAR(200),
    major VARCHAR(200),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_student_goals_student_id ON student_goals(student_id);
CREATE INDEX IF NOT EXISTS idx_student_goals_created_at ON student_goals(created_at DESC);

-- 기존 학생의 현재 목표를 이력으로 추가
INSERT INTO student_goals (student_id, university, major, created_at)
SELECT 
    student_id,
    target_university,
    target_major,
    CURRENT_TIMESTAMP
FROM students
WHERE target_university IS NOT NULL OR target_major IS NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN students.high_school_gpa IS '고등학교 내신 성적 (100점 만점)';
COMMENT ON COLUMN students.financial_sponsor IS '재정 보증인';
COMMENT ON COLUMN students.bank_statement_status IS '은행 잔고 증명 상태';
COMMENT ON COLUMN students.parent_name_ko IS '학부모 성명 (한국어)';
COMMENT ON COLUMN students.parent_phone IS '학부모 연락처';
COMMENT ON COLUMN students.club_activities IS '동아리 활동';
COMMENT ON COLUMN students.volunteer_activities IS '봉사 활동';
COMMENT ON COLUMN students.awards IS '수상 경력';
COMMENT ON COLUMN students.portfolio_status IS '포트폴리오 준비 상태';

COMMENT ON TABLE student_goals IS '학생 희망 대학 및 전공 변경 이력';