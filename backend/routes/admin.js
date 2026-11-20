const express = require('express')
const { In, IsNull } = require('typeorm')
const router = express.Router()

const MONTH_MAP = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
}

const { dataSource } = require('../db/data-source')
const auth = require('../middlewares/auth')
const isCoach = require('../middlewares/isCoach')
const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidNonNegativeInteger,
  isNotValidUuid,
  isNotValidHttpsUrl,
  isValidDateString
} = require('../utils/validators')

// 取得教練自己的課程列表：GET /api/admin/coaches/courses
router.get('/courses', auth, isCoach, async (req, res, next) => {
  try {
    const courseRepo = dataSource.getRepository('Course')
    const courses = await courseRepo.find({
      where: { user_id: req.user.id },
      order: { start_at: 'DESC' }
    })

    const courseIds = courses.map(course => course.id)
    const bookingCountMap = {}

    if (courseIds.length > 0) {
      const bookingRepo = dataSource.getRepository('CourseBooking')
      const activeBookings = await bookingRepo.find({
        where: {
          course_id: In(courseIds),
          cancelled_at: IsNull()
        }
      })

      for (const booking of activeBookings) {
        bookingCountMap[booking.course_id] =
          (bookingCountMap[booking.course_id] || 0) + 1
      }
    }

    const now = new Date()
    const data = courses.map(course => {
      const startAt = new Date(course.start_at)
      const endAt = new Date(course.end_at)
      let status = '已結束'
      if (now < startAt) {
        status = '尚未開始'
      } else if (now >= startAt && now < endAt) {
        status = '進行中'
      }

      return {
        id: course.id,
        status,
        name: course.name,
        start_at: course.start_at,
        end_at: course.end_at,
        max_participants: course.max_participants,
        participants: bookingCountMap[course.id] || 0
      }
    })

    res.status(200).json({
      status: 'success',
      data
    })
  } catch (error) {
    next(error)
  }
})

// 教練新增課程：POST /api/admin/coaches/courses
router.post('/courses', auth, isCoach, async (req, res, next) => {
  try {
    const {
      skill_id,
      name,
      description,
      start_at,
      end_at,
      max_participants,
      meeting_url
    } = req.body

    if (
      isUndefined(skill_id) ||
      isNotValidUuid(skill_id) ||
      isUndefined(name) ||
      isNotValidString(name) ||
      name.length > 100 ||
      isUndefined(description) ||
      isNotValidString(description) ||
      isUndefined(start_at) ||
      !isValidDateString(start_at) ||
      isUndefined(end_at) ||
      !isValidDateString(end_at) ||
      new Date(end_at) <= new Date(start_at) ||
      isUndefined(max_participants) ||
      isNotValidInteger(max_participants) ||
      isUndefined(meeting_url) ||
      isNotValidHttpsUrl(meeting_url)
    ) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const skillRepo = dataSource.getRepository('Skill')
    const existSkill = await skillRepo.findOne({ where: { id: skill_id } })
    if (!existSkill) {
      return res.status(400).json({
        status: 'failed',
        message: '技能不存在'
      })
    }

    const courseRepo = dataSource.getRepository('Course')
    const newCourse = courseRepo.create({
      user_id: req.user.id,
      skill_id,
      name,
      description,
      start_at: new Date(start_at),
      end_at: new Date(end_at),
      max_participants,
      meeting_url
    })
    const savedCourse = await courseRepo.save(newCourse)

    res.status(201).json({
      status: 'success',
      data: {
        course: savedCourse
      }
    })
  } catch (error) {
    next(error)
  }
})

// 取得教練單一課程詳情：GET /api/admin/coaches/courses/:courseId
router.get('/courses/:courseId', auth, isCoach, async (req, res, next) => {
  try {
    const { courseId } = req.params
    if (isNotValidUuid(courseId)) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const courseRepo = dataSource.getRepository('Course')
    const course = await courseRepo.findOne({
      where: {
        id: courseId,
        user_id: req.user.id
      },
      relations: {
        skill: true
      }
    })

    if (!course) {
      return res.status(400).json({
        status: 'failed',
        message: '課程不存在'
      })
    }

    res.status(200).json({
      status: 'success',
      data: {
        id: course.id,
        skill_id: course.skill_id,
        skill_name: course.skill ? course.skill.name : null,
        name: course.name,
        description: course.description,
        start_at: course.start_at,
        end_at: course.end_at,
        max_participants: course.max_participants,
        meeting_url: course.meeting_url
      }
    })
  } catch (error) {
    next(error)
  }
})

// 編輯教練單一課程：PUT /api/admin/coaches/courses/:courseId
router.put('/courses/:courseId', auth, isCoach, async (req, res, next) => {
  try {
    const { courseId } = req.params
    const {
      skill_id,
      name,
      description,
      start_at,
      end_at,
      max_participants,
      meeting_url
    } = req.body

    if (
      isNotValidUuid(courseId) ||
      isUndefined(skill_id) ||
      isNotValidUuid(skill_id) ||
      isUndefined(name) ||
      isNotValidString(name) ||
      name.length > 100 ||
      isUndefined(description) ||
      isNotValidString(description) ||
      isUndefined(start_at) ||
      !isValidDateString(start_at) ||
      isUndefined(end_at) ||
      !isValidDateString(end_at) ||
      new Date(end_at) <= new Date(start_at) ||
      isUndefined(max_participants) ||
      isNotValidInteger(max_participants) ||
      isUndefined(meeting_url) ||
      isNotValidHttpsUrl(meeting_url)
    ) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const courseRepo = dataSource.getRepository('Course')
    const existCourse = await courseRepo.findOne({
      where: {
        id: courseId,
        user_id: req.user.id
      }
    })

    if (!existCourse) {
      return res.status(400).json({
        status: 'failed',
        message: '課程不存在'
      })
    }

    const skillRepo = dataSource.getRepository('Skill')
    const existSkill = await skillRepo.findOne({ where: { id: skill_id } })
    if (!existSkill) {
      return res.status(400).json({
        status: 'failed',
        message: '技能不存在'
      })
    }

    await courseRepo.update(
      { id: courseId, user_id: req.user.id },
      {
        skill_id,
        name,
        description,
        start_at: new Date(start_at),
        end_at: new Date(end_at),
        max_participants,
        meeting_url
      }
    )

    const updatedCourse = await courseRepo.findOne({
      where: { id: courseId }
    })

    res.status(200).json({
      status: 'success',
      data: {
        course: updatedCourse
      }
    })
  } catch (error) {
    next(error)
  }
})

// 取得教練月營收統計：GET /api/admin/coaches/revenue?month=january
router.get('/revenue', auth, isCoach, async (req, res, next) => {
  try {
    const { month } = req.query
    if (
      isUndefined(month) ||
      isNotValidString(month) ||
      !Object.prototype.hasOwnProperty.call(MONTH_MAP, month)
    ) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const courseRepo = dataSource.getRepository('Course')
    const courses = await courseRepo.find({
      select: { id: true },
      where: { user_id: req.user.id }
    })

    if (courses.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          total: {
            revenue: 0,
            participants: 0,
            course_count: 0
          }
        }
      })
    }

    const courseIds = courses.map((course) => course.id)
    const bookingRepo = dataSource.getRepository('CourseBooking')
    const activeBookings = await bookingRepo.find({
      where: {
        course_id: In(courseIds),
        cancelled_at: IsNull()
      }
    })

    const year = new Date().getFullYear()
    const monthIndex = MONTH_MAP[month]
    const startDate = new Date(year, monthIndex, 1)
    const endDate = new Date(year, monthIndex + 1, 1)

    const monthBookings = activeBookings.filter((booking) => {
      const createdAt = new Date(booking.created_at)
      return createdAt >= startDate && createdAt < endDate
    })

    const courseCount = monthBookings.length
    const participants = new Set(monthBookings.map((b) => b.user_id)).size

    if (courseCount === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          total: {
            revenue: 0,
            participants: 0,
            course_count: 0
          }
        }
      })
    }

    const packageRepo = dataSource.getRepository('CreditPackage')
    const packages = await packageRepo.find({
      select: {
        credit_amount: true,
        price: true
      }
    })

    let totalPrice = 0
    let totalCredits = 0
    for (const pkg of packages) {
      totalPrice += Number(pkg.price)
      totalCredits += Number(pkg.credit_amount)
    }

    const perCreditPrice = totalCredits > 0 ? totalPrice / totalCredits : 0
    const revenue = Math.floor(courseCount * perCreditPrice)

    res.status(200).json({
      status: 'success',
      data: {
        total: {
          revenue,
          participants,
          course_count: courseCount
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

// 取得教練個人資料：GET /api/admin/coaches
router.get('/', auth, isCoach, async (req, res, next) => {
  try {
    const coachRepo = dataSource.getRepository('Coach')
    const coach = await coachRepo.findOne({
      where: { user_id: req.user.id }
    })

    if (!coach) {
      return res.status(400).json({
        status: 'failed',
        message: '找不到教練資料'
      })
    }

    const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill')
    const skillLinks = await coachLinkSkillRepo.find({
      where: { coach_id: coach.id }
    })

    res.status(200).json({
      status: 'success',
      data: {
        id: coach.id,
        experience_years: coach.experience_years,
        description: coach.description,
        profile_image_url: coach.profile_image_url,
        skill_ids: skillLinks.map(item => item.skill_id)
      }
    })
  } catch (error) {
    next(error)
  }
})

// 更新教練個人資料：PUT /api/admin/coaches
router.put('/', auth, isCoach, async (req, res, next) => {
  try {
    const { experience_years, description, profile_image_url, skill_ids } =
      req.body

    if (
      isUndefined(experience_years) ||
      isNotValidNonNegativeInteger(experience_years) ||
      isUndefined(description) ||
      isNotValidString(description) ||
      (!isUndefined(profile_image_url) &&
        profile_image_url !== null &&
        isNotValidHttpsUrl(profile_image_url)) ||
      !Array.isArray(skill_ids) ||
      skill_ids.some(id => isNotValidUuid(id))
    ) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const coachRepo = dataSource.getRepository('Coach')
    const coach = await coachRepo.findOne({
      where: { user_id: req.user.id }
    })

    if (!coach) {
      return res.status(400).json({
        status: 'failed',
        message: '找不到教練資料'
      })
    }

    const uniqueSkillIds = [...new Set(skill_ids)]
    if (uniqueSkillIds.length > 0) {
      const skillRepo = dataSource.getRepository('Skill')
      const existSkills = await skillRepo.find({
        where: { id: In(uniqueSkillIds) }
      })
      if (existSkills.length !== uniqueSkillIds.length) {
        return res.status(400).json({
          status: 'failed',
          message: '技能不存在'
        })
      }
    }

    await coachRepo.update(
      { id: coach.id },
      {
        experience_years,
        description,
        profile_image_url: profile_image_url ?? coach.profile_image_url
      }
    )

    const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill')
    await coachLinkSkillRepo.delete({ coach_id: coach.id })

    if (uniqueSkillIds.length > 0) {
      const newLinks = uniqueSkillIds.map(skillId =>
        coachLinkSkillRepo.create({
          coach_id: coach.id,
          skill_id: skillId
        })
      )
      await coachLinkSkillRepo.save(newLinks)
    }

    const updatedCoach = await coachRepo.findOne({
      where: { id: coach.id }
    })

    res.status(200).json({
      status: 'success',
      data: {
        id: updatedCoach.id,
        experience_years: updatedCoach.experience_years,
        description: updatedCoach.description,
        profile_image_url: updatedCoach.profile_image_url,
        skill_ids: uniqueSkillIds
      }
    })
  } catch (error) {
    next(error)
  }
})

// 將會員升級為教練：POST /api/admin/coaches/:userId
router.post('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params
    const { experience_years, description, profile_image_url } = req.body

    if (
      isNotValidUuid(userId) ||
      isUndefined(experience_years) ||
      isNotValidNonNegativeInteger(experience_years) ||
      isUndefined(description) ||
      isNotValidString(description) ||
      (!isUndefined(profile_image_url) &&
        profile_image_url !== null &&
        profile_image_url !== '' &&
        isNotValidHttpsUrl(profile_image_url))
    ) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const userRepo = dataSource.getRepository('User')
    const existUser = await userRepo.findOne({
      select: {
        id: true,
        name: true,
        role: true
      },
      where: { id: userId }
    })

    if (!existUser) {
      return res.status(400).json({
        status: 'failed',
        message: '使用者不存在'
      })
    }

    if (existUser.role === 'COACH') {
      return res.status(409).json({
        status: 'failed',
        message: '使用者已經是教練'
      })
    }

    await userRepo.update({ id: userId }, { role: 'COACH' })

    const coachRepo = dataSource.getRepository('Coach')
    const newCoach = coachRepo.create({
      user_id: userId,
      experience_years,
      description,
      profile_image_url: profile_image_url || null
    })
    const savedCoach = await coachRepo.save(newCoach)

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          name: existUser.name,
          role: 'COACH'
        },
        coach: savedCoach
      }
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
