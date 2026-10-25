// Combines all feature routers under /api/v1
const express = require('express');
const authRoutes = require('./auth.routes');
const courseRoutes = require('./course.routes');
const studentRoutes = require('./student.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/students', studentRoutes);

module.exports = router;
