const studentService = require('../services/student.service');
const enrollmentService = require('../services/enrollment.service');
const ApiError = require('../utils/ApiError');
const { buildPagination } = require('../utils/pagination');

async function ensureStudentExists(id) {
  const student = await studentService.findById(id);
  if (!student) throw ApiError.notFound(`Student ${id} not found`);
  return student;
}

// GET /api/v1/students?page=1&limit=10  (admin)
async function getAll(req, res) {
  const { page, limit } = req.validated.query;
  const { rows, total } = await studentService.findAll({ page, limit });
  res.status(200).json({ success: true, data: rows, pagination: buildPagination(page, limit, total) });
}

// POST /api/v1/students  (admin)
async function create(req, res) {
  const student = await studentService.create(req.validated.body);
  res.status(201).location(`/api/v1/students/${student.student_id}`).json({
    success: true,
    message: 'Student created',
    data: student,
  });
}

// GET /api/v1/students/:id  (admin or the student)
async function getById(req, res) {
  const student = await ensureStudentExists(req.validated.params.id);
  res.status(200).json({ success: true, data: student });
}

// GET /api/v1/students/:id/enrollments  (admin or the student)
async function getEnrollments(req, res) {
  const student = await ensureStudentExists(req.validated.params.id);
  const courses = await enrollmentService.findByStudent(student.student_id);
  res.status(200).json({
    success: true,
    data: { student, total_courses: courses.length, courses },
  });
}

// POST /api/v1/students/:id/enrollments  { course_id }  (admin or the student)
async function enroll(req, res) {
  const { id } = req.validated.params;
  const { course_id: courseId } = req.validated.body;
  const enrollment = await enrollmentService.enroll(id, courseId);
  res.status(201).json({
    success: true,
    message: `Enrolled in ${enrollment.course_name}`,
    data: enrollment,
  });
}

// DELETE /api/v1/students/:id/enrollments/:courseId  (admin or the student)
async function cancelEnrollment(req, res) {
  const { id, courseId } = req.validated.params;
  const cancelled = await enrollmentService.cancel(id, courseId);
  if (!cancelled) throw ApiError.notFound(`Student ${id} is not enrolled in course ${courseId}`);
  res.status(200).json({ success: true, message: 'Enrollment cancelled, seat released' });
}

module.exports = { getAll, create, getById, getEnrollments, enroll, cancelEnrollment };
