-- SeatSure sample data (development only)
-- Admin login:    admin@seatsure.edu / Admin@123
-- Student logins: <any student email below> / Student@123

INSERT INTO Admins (name, email, password_hash) VALUES
('SeatSure Admin', 'admin@seatsure.edu', '$2a$10$X02SiuEBN423WWazbXOeo.51JV9os3BT9IC0YkDJcx9/nzJxtz7oe');

INSERT INTO Students (name, email, password_hash) VALUES
('Karuna Sharma', 'karuna.sharma@college.edu', '$2a$10$azqBVRalKfQeoMLLUKa0LeIFgAisdcKBj0Vufly7xikNCfmi54mUG'),
('Aarav Mehta',   'aarav.mehta@college.edu',   '$2a$10$azqBVRalKfQeoMLLUKa0LeIFgAisdcKBj0Vufly7xikNCfmi54mUG'),
('Diya Iyer',     'diya.iyer@college.edu',     '$2a$10$azqBVRalKfQeoMLLUKa0LeIFgAisdcKBj0Vufly7xikNCfmi54mUG'),
('Rohan Verma',   'rohan.verma@college.edu',   '$2a$10$azqBVRalKfQeoMLLUKa0LeIFgAisdcKBj0Vufly7xikNCfmi54mUG');

-- "Cloud Computing Lab" has only 2 seats so "course is full" is easy to demo
INSERT INTO Courses (course_name, capacity) VALUES
('Full Stack Web Development', 30),
('Data Structures in Java',    40),
('Cloud Computing Lab',         2),
('Machine Learning Basics',    25);

INSERT INTO Enrollments (student_id, course_id) VALUES
(1, 1),   -- Karuna -> Full Stack
(1, 3),   -- Karuna -> Cloud Lab
(2, 3);   -- Aarav  -> Cloud Lab  (Cloud Lab is now FULL: 2/2)
GO
