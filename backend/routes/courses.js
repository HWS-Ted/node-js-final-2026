const express = require('express')
const { LessThanOrEqual, MoreThan, IsNull } = require('typeorm')
const router = express.Router()

const { dataSource } = require('../db/data-source')
const auth = require('../middlewares/auth')
const { isNotValidUuid } = require('../utils/validators')

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

// 會員報名課程：POST /api/courses/:courseId
router.post('/:courseId', auth, async (req, res, next) => {
  try {
    const { courseId } = req.params
    if (isNotValidUuid(courseId)) {
      return res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
    }

    const courseRepo = dataSource.getRepository('Course')
    const course = await courseRepo.findOne({
      where: { id: courseId }
    })
    if (!course) {
      return res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
    }

    const bookingRepo = dataSource.getRepository('CourseBooking')

    // 檢查是否曾報名過（包含已取消的紀錄）
    const existBooking = await bookingRepo.findOne({
      where: {
        user_id: req.user.id,
        course_id: courseId
      }
    })
    if (existBooking) {
      return res.status(400).json({
        status: 'failed',
        message: '已經報名過此課程'
      })
    }

    // 檢查剩餘可使用堂數
    const purchaseRepo = dataSource.getRepository('CreditPurchase')
    const purchases = await purchaseRepo.find({
      where: { user_id: req.user.id }
    })
    const totalPurchased = purchases.reduce(
      (sum, item) => sum + Number(item.purchased_credits),
      0
    )

    const userUsedCount = await bookingRepo.count({
      where: {
        user_id: req.user.id,
        cancelled_at: IsNull()
      }
    })
    if (userUsedCount >= totalPurchased) {
      return res.status(400).json({
        status: 'failed',
        message: '已無可使用堂數'
      })
    }

    // 檢查課程是否已達最大參加人數
    const courseBookingCount = await bookingRepo.count({
      where: {
        course_id: courseId,
        cancelled_at: IsNull()
      }
    })
    if (courseBookingCount >= course.max_participants) {
      return res.status(400).json({
        status: 'failed',
        message: '已達最大參加人數，無法參加'
      })
    }

    const newBooking = bookingRepo.create({
      user_id: req.user.id,
      course_id: courseId
    })
    await bookingRepo.save(newBooking)

    res.status(201).json({
      status: 'success',
      data: null
    })
  } catch (error) {
    next(error)
  }
})

// 會員取消報名（軟刪除）：DELETE /api/courses/:courseId
router.delete('/:courseId', auth, async (req, res, next) => {
  try {
    const { courseId } = req.params
    if (isNotValidUuid(courseId)) {
      return res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
    }

    const bookingRepo = dataSource.getRepository('CourseBooking')
    const existBooking = await bookingRepo.findOne({
      where: {
        user_id: req.user.id,
        course_id: courseId,
        cancelled_at: IsNull()
      }
    })
    if (!existBooking) {
      return res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
    }

    await bookingRepo.update(
      { id: existBooking.id },
      { cancelled_at: new Date() }
    )

    res.status(200).json({
      status: 'success',
      data: null
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
