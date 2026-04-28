CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','faculty','student') NOT NULL
);

CREATE TABLE IF NOT EXISTS classrooms (
  room_id INT PRIMARY KEY,
  room_number VARCHAR(20) UNIQUE NOT NULL,
  capacity INT NOT NULL,
  projector ENUM('Yes','No') NOT NULL
);

CREATE TABLE IF NOT EXISTS timetable (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  day VARCHAR(20) NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  subject VARCHAR(10) NOT NULL,
  UNIQUE KEY uq_timetable (room_id, day, time_slot)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT PRIMARY KEY,
  user_id INT NOT NULL,
  room_id INT NOT NULL,
  date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  purpose VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS complaints (
  id INT PRIMARY KEY,
  user_id INT NOT NULL,
  room_id INT NOT NULL,
  issue_type ENUM('Projector','AC','Furniture','Locked Room') NOT NULL,
  description VARCHAR(255) NOT NULL,
  status ENUM('Pending','In Progress','Resolved') NOT NULL
);

INSERT INTO classrooms (room_id, room_number, capacity, projector) VALUES
(1, 'A101', 40, 'Yes'),
(2, 'A102', 35, 'No'),
(3, 'B201', 50, 'Yes'),
(4, 'B202', 45, 'Yes'),
(5, 'C301', 60, 'No');

INSERT INTO timetable (room_id, day, time_slot, subject) VALUES
(1, 'Monday', '08:00-09:00', 'DB'),
(2, 'Monday', '09:00-10:00', 'OS'),
(3, 'Monday', '10:00-11:00', 'CN'),
(4, 'Monday', '11:00-12:00', 'AI'),
(1, 'Tuesday', '09:00-10:00', 'SE'),
(3, 'Tuesday', '08:00-09:00', 'ML'),
(5, 'Tuesday', '10:00-11:00', 'DB'),
(2, 'Wednesday', '08:00-09:00', 'CN'),
(4, 'Wednesday', '09:00-10:00', 'OS'),
(5, 'Wednesday', '11:00-12:00', 'AI'),
(1, 'Thursday', '10:00-11:00', 'ML'),
(3, 'Thursday', '11:00-12:00', 'SE'),
(4, 'Thursday', '08:00-09:00', 'DB'),
(2, 'Friday', '10:00-11:00', 'AI'),
(3, 'Friday', '09:00-10:00', 'CN'),
(5, 'Friday', '08:00-09:00', 'OS');

INSERT INTO users (id, name, email, password, role) VALUES
(1, 'Admin User', 'admin@ecs.edu', 'admin123', 'admin'),
(2, 'Dr. Meera', 'meera@ecs.edu', 'faculty123', 'faculty'),
(3, 'Prof. Arun', 'arun@ecs.edu', 'faculty123', 'faculty'),
(4, 'Riya Sharma', 'riya@ecs.edu', 'student123', 'student'),
(5, 'Karan Patel', 'karan@ecs.edu', 'student123', 'student'),
(6, 'Nisha Verma', 'nisha@ecs.edu', 'student123', 'student');

INSERT INTO bookings (id, user_id, room_id, date, time_slot, purpose) VALUES
(1, 2, 4, '2026-04-14', '10:00-11:00', 'Guest lecture'),
(2, 3, 2, '2026-04-16', '11:00-12:00', 'Remedial class'),
(3, 2, 5, '2026-04-17', '09:00-10:00', 'Workshop');

INSERT INTO complaints (id, user_id, room_id, issue_type, description, status) VALUES
(1, 4, 1, 'Projector', 'Projector not turning on in A101.', 'Pending'),
(2, 5, 3, 'AC', 'AC cooling is weak in B201.', 'Resolved'),
(3, 6, 5, 'Furniture', 'Two broken chairs found in C301.', 'Pending');
