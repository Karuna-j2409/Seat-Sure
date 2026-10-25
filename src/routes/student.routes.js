const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate, authorize, selfOrAdmin } = require('../middlewares/auth');
const controller = require('../controllers/student.controller');
const {
  createStudentSchema,
  paginationSchema,
  idParamSchema,
  enrollmentParamsSchema,
  enrollSchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticate); // every student route needs a logged-in user

// Admin only
router.get('/', authorize('admin'), validate(paginationSchema, 'query'), controller.getAll);
router.post('/', authorize('admin'), validate(createStudentSchema), controller.create);

// Admin, or the student themself
router.get('/:id', validate(idParamSchema, 'params'), selfOrAdmin, controller.getById);
router.get('/:id/enrollments', validate(idParamSchema, 'params'), selfOrAdmin, controller.getEnrollments);
router.post(
  '/:id/enrollments',
  validate(idParamSchema, 'params'),
  selfOrAdmin,
  validate(enrollSchema),
  controller.enroll
);
router.delete(
  '/:id/enrollments/:courseId',
  validate(enrollmentParamsSchema, 'params'),
  selfOrAdmin,
  controller.cancelEnrollment
);

module.exports = router;
