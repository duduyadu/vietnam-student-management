const db = require('../config/database');

async function createReportTables() {
  try {
    console.log('🚀 Creating report system tables...');
    
    // 1. Create exam_results table
    console.log('Creating exam_results table...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS exam_results (
        exam_id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        exam_name VARCHAR(100) NOT NULL,
        exam_type VARCHAR(50) NOT NULL DEFAULT 'academic',
        subject VARCHAR(100),
        exam_date DATE NOT NULL,
        semester VARCHAR(20),
        score NUMERIC(5,2),
        max_score NUMERIC(5,2),
        percentage NUMERIC(5,2),
        grade VARCHAR(10),
        rank INTEGER,
        total_students INTEGER,
        detailed_scores JSONB,
        notes TEXT,
        certificate_path VARCHAR(500),
        created_by INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_exam_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        CONSTRAINT fk_exam_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
      )
    `);
    console.log('✅ exam_results table created');
    
    // 2. Create learning_progress table
    console.log('Creating learning_progress table...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS learning_progress (
        progress_id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        subject VARCHAR(100) NOT NULL,
        course_name VARCHAR(150),
        level VARCHAR(50),
        record_date DATE NOT NULL,
        semester VARCHAR(20),
        total_lessons INTEGER,
        completed_lessons INTEGER,
        completion_percentage NUMERIC(5,2),
        attendance_count INTEGER,
        absence_count INTEGER,
        attendance_rate NUMERIC(5,2),
        quiz_average NUMERIC(5,2),
        assignment_average NUMERIC(5,2),
        participation_score NUMERIC(5,2),
        strengths TEXT,
        weaknesses TEXT,
        improvement_areas TEXT,
        monthly_goals TEXT,
        action_plan TEXT,
        target_completion_date DATE,
        overall_performance VARCHAR(20) CHECK (overall_performance IN ('excellent', 'good', 'average', 'below_average', 'poor')),
        teacher_comments TEXT,
        skill_assessment JSONB,
        teacher_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_progress_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        CONSTRAINT fk_progress_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id)
      )
    `);
    console.log('✅ learning_progress table created');
    
    // 3. Create academic_goals table
    console.log('Creating academic_goals table...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS academic_goals (
        goal_id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        goal_type VARCHAR(50) NOT NULL,
        goal_category VARCHAR(100),
        goal_description TEXT NOT NULL,
        priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
        start_date DATE NOT NULL,
        target_date DATE NOT NULL,
        completion_date DATE,
        status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'delayed', 'cancelled')),
        target_score NUMERIC(5,2),
        current_score NUMERIC(5,2),
        progress_percentage NUMERIC(5,2),
        milestones JSONB,
        action_steps TEXT,
        required_resources TEXT,
        potential_obstacles TEXT,
        support_needed TEXT,
        teacher_feedback TEXT,
        student_reflection TEXT,
        adjustment_notes TEXT,
        created_by INTEGER,
        assigned_teacher INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_goal_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        CONSTRAINT fk_goal_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
        CONSTRAINT fk_goal_teacher FOREIGN KEY (assigned_teacher) REFERENCES users(user_id)
      )
    `);
    console.log('✅ academic_goals table created');
    
    // 4. Create report_templates table
    console.log('Creating report_templates table...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS report_templates (
        template_id SERIAL PRIMARY KEY,
        template_name VARCHAR(100) NOT NULL,
        template_code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('consultation', 'academic_progress', 'comprehensive', 'performance_analysis', 'goal_tracking')),
        template_config JSONB,
        html_template TEXT,
        css_styles TEXT,
        data_sources JSONB,
        chart_configs JSONB,
        labels_ko JSONB,
        labels_vi JSONB,
        allowed_roles JSONB,
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        version VARCHAR(20) DEFAULT '1.0',
        parent_template_id INTEGER,
        created_by INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_template_parent FOREIGN KEY (parent_template_id) REFERENCES report_templates(template_id),
        CONSTRAINT fk_template_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
      )
    `);
    console.log('✅ report_templates table created');
    
    // 5. Create generated_reports table
    console.log('Creating generated_reports table...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS generated_reports (
        report_id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        template_id INTEGER,
        report_title VARCHAR(200) NOT NULL,
        report_date DATE NOT NULL,
        period_start DATE,
        period_end DATE,
        report_data JSONB,
        chart_data JSONB,
        summary_text TEXT,
        recommendations TEXT,
        pdf_path VARCHAR(500),
        html_path VARCHAR(500),
        file_size INTEGER,
        file_hash VARCHAR(64),
        status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed', 'archived')),
        error_message TEXT,
        generation_time_ms INTEGER,
        shared_with JSONB,
        is_public BOOLEAN DEFAULT false,
        expires_at DATE,
        generated_by INTEGER NOT NULL,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_accessed_at TIMESTAMP WITH TIME ZONE,
        access_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_report_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        CONSTRAINT fk_report_template FOREIGN KEY (template_id) REFERENCES report_templates(template_id),
        CONSTRAINT fk_report_generator FOREIGN KEY (generated_by) REFERENCES users(user_id)
      )
    `);
    console.log('✅ generated_reports table created');
    
    // Create indexes
    console.log('Creating indexes...');
    
    // Exam results indexes
    await db.raw('CREATE INDEX IF NOT EXISTS idx_exam_results_student_date ON exam_results(student_id, exam_date)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_exam_results_type ON exam_results(exam_name, exam_type)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_exam_results_semester ON exam_results(semester)');
    
    // Learning progress indexes
    await db.raw('CREATE INDEX IF NOT EXISTS idx_learning_progress_student_date ON learning_progress(student_id, record_date)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_learning_progress_subject ON learning_progress(subject, level)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_learning_progress_semester ON learning_progress(semester)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_learning_progress_teacher ON learning_progress(teacher_id)');
    
    // Academic goals indexes
    await db.raw('CREATE INDEX IF NOT EXISTS idx_academic_goals_student_status ON academic_goals(student_id, status)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_academic_goals_type ON academic_goals(goal_type, goal_category)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_academic_goals_target_date ON academic_goals(target_date)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_academic_goals_teacher ON academic_goals(assigned_teacher)');
    
    // Report templates indexes
    await db.raw('CREATE INDEX IF NOT EXISTS idx_report_templates_code ON report_templates(template_code)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(report_type)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates(is_active)');
    
    // Generated reports indexes
    await db.raw('CREATE INDEX IF NOT EXISTS idx_generated_reports_student_date ON generated_reports(student_id, report_date)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_generated_reports_template ON generated_reports(template_id)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_generated_reports_status ON generated_reports(status)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_generated_reports_generator ON generated_reports(generated_by)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_generated_reports_generated_at ON generated_reports(generated_at)');
    
    console.log('✅ All indexes created');
    
    console.log('✅ All report system tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating report tables:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the migration
createReportTables().then(() => {
  console.log('Report tables creation completed!');
  process.exit(0);
}).catch(error => {
  console.error('Report tables creation failed:', error);
  process.exit(1);
});