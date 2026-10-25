// All Zod validation schemas for SeatSure
const { z } = require('zod');

// Friendly "is required" vs "wrong type" messages
const typeError = (field, type) => (issue) =>
  issue.input === undefined ? `${field} is required` : `${field} must be ${type}`;

const positiveId = (field) =>
  z.coerce
    .number({ error: typeError(field, 'a number') })
    .int(`${field} must be a whole number`)
    .positive(`${field} must be a positive number`);

const email = z
  .string({ error: typeError('email', 'text') })
  .trim()
  .toLowerCase()
  .max(100, 'email must be at most 100 characters')
  .pipe(z.email('email format is invalid'));

// ---- Auth ----
const loginSchema = z.object({
  email,
  password: z.string({ error: 'password is required' }).min(1, 'password is required'),
});

// ---- Students ----
const createStudentSchema = z.object({
  name: z
    .string({ error: typeError('name', 'text') })
    .trim()
    .min(2, 'name must have at least 2 characters')
    .max(100, 'name must be at most 100 characters'),
  email,
  password: z
    .string({ error: typeError('password', 'text') })
    .min(8, 'password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'password must contain a letter')
    .regex(/[0-9]/, 'password must contain a number'),
});

// ---- Courses ----
const createCourseSchema = z.object({
  course_name: z
    .string({ error: typeError('course_name', 'text') })
    .trim()
    .min(2, 'course_name must have at least 2 characters')
    .max(100, 'course_name must be at most 100 characters'),
  capacity: z
    .number({ error: typeError('capacity', 'a number') })
    .int('capacity must be a whole number')
    .min(1, 'capacity must be at least 1')
    .max(500, 'capacity can be at most 500'),
});

const courseListQuerySchema = z.object({
  available: z.enum(['true', 'false'], { error: 'available must be true or false' }).optional(),
});

// ---- Enrollments ----
const enrollSchema = z.object({
  course_id: positiveId('course_id'),
});

// ---- Common ----
const idParamSchema = z.object({ id: positiveId('id') });

const enrollmentParamsSchema = z.object({
  id: positiveId('id'),
  courseId: positiveId('courseId'),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'page must be 1 or more').default(1),
  limit: z.coerce.number().int().min(1, 'limit must be 1 or more').max(100, 'limit can be at most 100').default(10),
});

module.exports = {
  loginSchema,
  createStudentSchema,
  createCourseSchema,
  courseListQuerySchema,
  enrollSchema,
  idParamSchema,
  enrollmentParamsSchema,
  paginationSchema,
};
