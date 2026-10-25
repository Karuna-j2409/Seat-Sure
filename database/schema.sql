-- SeatSure schema (Microsoft SQL Server 2019+)
-- Run automatically by `npm run db:setup`.
-- Manual alternative: create a database called seatsure, then run this file in SSMS.

-- Drop the child table first because it depends on the others
IF OBJECT_ID('Enrollments', 'U') IS NOT NULL DROP TABLE Enrollments;
IF OBJECT_ID('Students', 'U') IS NOT NULL DROP TABLE Students;
IF OBJECT_ID('Courses', 'U') IS NOT NULL DROP TABLE Courses;
IF OBJECT_ID('Admins', 'U') IS NOT NULL DROP TABLE Admins;
GO

CREATE TABLE Admins (
    admin_id       INT IDENTITY(1,1) PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(100) NOT NULL CONSTRAINT UQ_Admins_email UNIQUE,
    password_hash  CHAR(60)     NOT NULL,     -- bcrypt hash
    created_at     DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Students (
    student_id     INT IDENTITY(1,1) PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(100) NOT NULL CONSTRAINT UQ_Students_email UNIQUE,
    password_hash  CHAR(60)     NOT NULL,     -- students log in to manage their own enrollments
    created_at     DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Courses (
    course_id    INT IDENTITY(1,1) PRIMARY KEY,
    course_name  VARCHAR(100) NOT NULL CONSTRAINT UQ_Courses_name UNIQUE,
    capacity     INT          NOT NULL CONSTRAINT CK_Courses_capacity CHECK (capacity > 0),
    created_at   DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Junction table: turns Students <-> Courses (many-to-many) into two one-to-many relationships
CREATE TABLE Enrollments (
    enrollment_id  INT IDENTITY(1,1) PRIMARY KEY,
    student_id     INT       NOT NULL,
    course_id      INT       NOT NULL,
    enrolled_on    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Enrollments_Students FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    CONSTRAINT FK_Enrollments_Courses  FOREIGN KEY (course_id)  REFERENCES Courses(course_id)  ON DELETE CASCADE,
    CONSTRAINT UQ_Enrollments_student_course UNIQUE (student_id, course_id)   -- no duplicate enrollment
);

-- Speeds up "count enrollments per course" (the UNIQUE index above already covers lookups by student)
CREATE INDEX IX_Enrollments_course ON Enrollments(course_id);
GO
