const express = require('express')
const { LessThanOrEqual, MoreThan } = require('typeorm')
const router = express.Router()

const { dataSource } = require('../db/data-source')

// 取得進行中課程列表：GET /api/courses
router.get('/', async (req, res, next) => {
  try {
    const now = new Date()
    const courseRepo = dataSource.getRepository('Course')
    const courses = await courseRepo.find({
      where: {
        start_at: LessThanOrEqual(now),
        end_at: MoreThan(now)
      },
      relations: {
        user: true,
        skill: true
      },
      order: {
        start_at: 'ASC'
      }
    })

    const data = courses.map(course => ({
      id: course.id,
      coach_name: course.user ? course.user.name : '',
      skill_name: course.skill ? course.skill.name : '',
      name: course.name,
      description: course.description,
      start_at: course.start_at,
      end_at: course.end_at,
      max_participants: course.max_participants
    }))

    res.status(200).json({
      status: 'success',
      data
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
