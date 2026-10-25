const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const controller = require('../controllers/course.controller');
const { courseListQuerySchema, createCourseSchema, idParamSchema } = require('../validators/schemas');

const router = express.Router();

// Public: anyone can browse courses and seat availability
router.get('/', validate(courseListQuerySchema, 'query'), controller.getAll);
router.get('/:id', validate(idParamSchema, 'params'), controller.getById);

// Admin only: create a course
router.post('/', authenticate, authorize('admin'), validate(createCourseSchema), controller.create);

module.exports = router;
