-- Driving School Database Showcase SQL
-- Source: curated from the course report "驾校数据库_终版"
-- Purpose: present representative schema design, views, procedures,
--          and analytical queries for portfolio review.

USE DrivingSchoolDB;
GO

/* ------------------------------------------------------------
   1. Representative table definitions
------------------------------------------------------------ */

CREATE TABLE Student (
  student_id VARCHAR(20) PRIMARY KEY,
  name NVARCHAR(50) NOT NULL,
  phone VARCHAR(11) NOT NULL,
  id_card VARCHAR(18) NOT NULL UNIQUE,
  register_date DATE NOT NULL,
  expiry_date DATE NOT NULL
);

CREATE TABLE Instructor (
  instructor_id VARCHAR(6) PRIMARY KEY,
  name NVARCHAR(50) NOT NULL,
  phone VARCHAR(11) NOT NULL,
  allowed_vehicle_type VARCHAR(2) NOT NULL,
  status NVARCHAR(10) NOT NULL,
  base_salary DECIMAL(10, 2) NOT NULL
);

CREATE TABLE Vehicle (
  vehicle_id VARCHAR(20) PRIMARY KEY,
  plate_number NVARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(2) NOT NULL,
  status NVARCHAR(20) NOT NULL,
  instructor_id VARCHAR(6) NOT NULL,
  CONSTRAINT FK_Vehicle_Instructor
    FOREIGN KEY (instructor_id) REFERENCES Instructor(instructor_id)
);

CREATE TABLE Course (
  course_id VARCHAR(10) PRIMARY KEY,
  price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE Payment (
  payment_id VARCHAR(20) PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  course_id VARCHAR(10) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  CONSTRAINT FK_Payment_Student
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
  CONSTRAINT FK_Payment_Course
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);

CREATE TABLE Instructor_Available_Time (
  availability_id VARCHAR(20) PRIMARY KEY,
  instructor_id VARCHAR(6) NOT NULL,
  available_date DATE NOT NULL,
  available_slots VARCHAR(50) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT N'可用',
  CONSTRAINT FK_AvailableTime_Instructor
    FOREIGN KEY (instructor_id) REFERENCES Instructor(instructor_id)
);

CREATE TABLE Training_Session (
  session_id VARCHAR(20) PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  instructor_id VARCHAR(6) NOT NULL,
  vehicle_id VARCHAR(20) NOT NULL,
  available_time_id VARCHAR(20) NOT NULL,
  student_selected_slot VARCHAR(4) NOT NULL,
  subject NVARCHAR(10) NOT NULL,
  status NVARCHAR(20) NOT NULL,
  CONSTRAINT FK_Session_Student
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
  CONSTRAINT FK_Session_Instructor
    FOREIGN KEY (instructor_id) REFERENCES Instructor(instructor_id),
  CONSTRAINT FK_Session_Vehicle
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id),
  CONSTRAINT FK_Session_AvailableTime
    FOREIGN KEY (available_time_id) REFERENCES Instructor_Available_Time(availability_id)
);

CREATE TABLE Student_Training_Hours (
  record_id VARCHAR(20) PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  training_date DATE NOT NULL,
  subject NVARCHAR(10) NOT NULL,
  hours_completed INT NOT NULL DEFAULT 0,
  session_id VARCHAR(20) NOT NULL,
  CONSTRAINT FK_TrainingHours_Student
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
  CONSTRAINT FK_TrainingHours_Session
    FOREIGN KEY (session_id) REFERENCES Training_Session(session_id)
);

CREATE TABLE Instructor_Performance (
  performance_id VARCHAR(20) PRIMARY KEY,
  instructor_id VARCHAR(6) NOT NULL,
  month_year DATE NOT NULL,
  completed_sessions INT NOT NULL DEFAULT 0,
  performance_bonus DECIMAL(10, 2) NOT NULL DEFAULT 0,
  CONSTRAINT FK_Performance_Instructor
    FOREIGN KEY (instructor_id) REFERENCES Instructor(instructor_id)
);
GO

/* ------------------------------------------------------------
   2. Representative views from the report
------------------------------------------------------------ */

CREATE VIEW v_Payment_Summary AS
SELECT
  s.student_id,
  s.name AS student_name,
  COUNT(p.payment_id) AS payment_count,
  SUM(p.amount) AS total_paid,
  MIN(p.payment_date) AS first_payment_date,
  MAX(p.payment_date) AS latest_payment_date
FROM Student s
LEFT JOIN Payment p
  ON s.student_id = p.student_id
GROUP BY s.student_id, s.name;
GO

CREATE VIEW v_Instructor_Performance AS
SELECT
  i.instructor_id,
  i.name AS instructor_name,
  ip.month_year,
  ip.completed_sessions,
  ip.performance_bonus
FROM Instructor_Performance ip
JOIN Instructor i
  ON ip.instructor_id = i.instructor_id;
GO

CREATE VIEW v_Student_My_Sessions AS
SELECT
  ts.session_id,
  ts.student_id,
  s.name AS student_name,
  ts.subject,
  ts.status,
  ts.student_selected_slot,
  i.name AS instructor_name,
  v.plate_number
FROM Training_Session ts
JOIN Student s
  ON ts.student_id = s.student_id
JOIN Instructor i
  ON ts.instructor_id = i.instructor_id
JOIN Vehicle v
  ON ts.vehicle_id = v.vehicle_id;
GO

/* ------------------------------------------------------------
   3. Representative stored procedure
------------------------------------------------------------ */

CREATE PROCEDURE sp_CalculateInstructorPerformance
  @target_month DATE
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    i.instructor_id,
    i.name,
    COUNT(CASE WHEN ts.status = N'已完成' THEN 1 END) AS completed_sessions,
    COUNT(CASE WHEN ts.status = N'已完成' THEN 1 END) * 50.00 AS estimated_bonus
  FROM Instructor i
  LEFT JOIN Training_Session ts
    ON i.instructor_id = ts.instructor_id
  LEFT JOIN Instructor_Available_Time iat
    ON ts.available_time_id = iat.availability_id
   AND YEAR(iat.available_date) = YEAR(@target_month)
   AND MONTH(iat.available_date) = MONTH(@target_month)
  GROUP BY i.instructor_id, i.name
  ORDER BY completed_sessions DESC, i.instructor_id;
END;
GO

/* ------------------------------------------------------------
   4. Sample analytical queries for portfolio display
------------------------------------------------------------ */

-- Query A: reservation status statistics
SELECT
  status,
  COUNT(*) AS session_count
FROM Training_Session
GROUP BY status
ORDER BY session_count DESC;
GO

-- Query B: student payment summary
SELECT
  s.student_id,
  s.name,
  c.course_id,
  COUNT(p.payment_id) AS payment_count,
  SUM(p.amount) AS total_paid
FROM Student s
JOIN Payment p
  ON s.student_id = p.student_id
JOIN Course c
  ON p.course_id = c.course_id
GROUP BY s.student_id, s.name, c.course_id
ORDER BY total_paid DESC;
GO

-- Query C: training-hour progress by student
SELECT
  s.student_id,
  s.name,
  sth.subject,
  SUM(sth.hours_completed) AS total_hours
FROM Student s
JOIN Student_Training_Hours sth
  ON s.student_id = sth.student_id
GROUP BY s.student_id, s.name, sth.subject
ORDER BY s.student_id, sth.subject;
GO

-- Query D: completed sessions and bonus estimation by instructor
SELECT
  i.instructor_id,
  i.name,
  COUNT(CASE WHEN ts.status = N'已完成' THEN 1 END) AS completed_sessions,
  COUNT(CASE WHEN ts.status = N'已完成' THEN 1 END) * 50.00 AS estimated_bonus
FROM Instructor i
LEFT JOIN Training_Session ts
  ON i.instructor_id = ts.instructor_id
GROUP BY i.instructor_id, i.name
ORDER BY completed_sessions DESC;
GO
