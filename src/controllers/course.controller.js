const courseService = require('../services/course.service');
const ApiError = require('../utils/ApiError');

// GET /api/v1/courses            -> all courses with seats left
// GET /api/v1/courses?available=true -> only courses that still have seats
async function getAll(req, res) {
  const onlyAvailable = req.validated.query.available === 'true';
  const courses = await courseService.findAll({ onlyAvailable });
  res.status(200).json({ success: true, data: courses });
}

// GET /api/v1/courses/:id
async function getById(req, res) {
  const { id } = req.validated.params;
  const course = await courseService.findById(id);
  if (!course) throw ApiError.notFound(`Course ${id} not found`);
  res.status(200).json({ success: true, data: course });
}

// POST /api/v1/courses  (admin)
async function create(req, res) {
  const course = await courseService.create(req.validated.body);
  res.status(201).location(`/api/v1/courses/${course.course_id}`).json({
    success: true,
    message: 'Course created',
    data: course,
  });
}

module.exports = { getAll, getById, create };
