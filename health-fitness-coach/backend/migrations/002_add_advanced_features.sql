"""
Database Migration - Add Advanced Features Tables
Run this after updating the database/models.py file
"""

# This migration adds support for:
# - Body Measurements (chest, waist, hips, arms tracking)
# - Water Intake (daily hydration tracking)
# - Meal Photos (photo-based calorie logging)
# - Workout Suggestions (proactive AI suggestions)
# - Recipe Suggestions (macro-matched recipes)
# - Weekly Reports (automated weekly summaries)
# - Exercise Videos (exercise form library)

# SQLAlchemy will auto-create these tables on app startup if using:
# from database import init_db
# init_db()

# Manual SQL for direct database creation:

CREATE TABLE IF NOT EXISTS body_measurements (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    weight_lbs FLOAT,
    chest_inches FLOAT,
    waist_inches FLOAT,
    hips_inches FLOAT,
    arms_inches FLOAT,
    body_fat_percent FLOAT,
    notes TEXT,
    measured_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS water_intake (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    glasses INT DEFAULT 0,
    ounces FLOAT DEFAULT 0.0,
    daily_goal_ounces FLOAT DEFAULT 64.0,
    logged_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_photos (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    photo_url VARCHAR,
    estimated_calories FLOAT,
    estimated_macros JSON,
    user_notes VARCHAR,
    meal_type VARCHAR(50),
    logged_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workout_suggestions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    suggestion_text VARCHAR,
    reason VARCHAR(50),
    accepted BOOLEAN DEFAULT FALSE,
    accepted_at DATETIME,
    suggested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_suggestions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    recipe_name VARCHAR(200),
    ingredients JSON,
    instructions VARCHAR,
    estimated_calories FLOAT,
    macros JSON,
    prep_time_minutes INT,
    dietary_tags JSON,
    match_score FLOAT,
    suggested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weekly_reports (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    week_start DATETIME,
    week_end DATETIME,
    total_workouts INT DEFAULT 0,
    total_minutes INT DEFAULT 0,
    avg_calories_burned FLOAT,
    total_calories_logged FLOAT,
    weight_change_lbs FLOAT,
    trends JSON,
    insights VARCHAR,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercise_videos (
    id VARCHAR(50) PRIMARY KEY,
    exercise_name VARCHAR(100) UNIQUE,
    video_url VARCHAR,
    gif_url VARCHAR,
    form_tips JSON,
    common_mistakes JSON,
    variations JSON,
    muscle_groups JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX idx_body_measurements_user ON body_measurements(user_id, measured_date DESC);
CREATE INDEX idx_water_intake_user ON water_intake(user_id, logged_date DESC);
CREATE INDEX idx_meal_photos_user ON meal_photos(user_id, logged_date DESC);
CREATE INDEX idx_workout_suggestions_user ON workout_suggestions(user_id, suggested_at DESC);
CREATE INDEX idx_recipe_suggestions_user ON recipe_suggestions(user_id, suggested_at DESC);
CREATE INDEX idx_weekly_reports_user ON weekly_reports(user_id, week_start DESC);
