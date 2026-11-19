const express = require('express')
const { MoreThan } = require('typeorm')
const router = express.Router()

const { dataSource } = require('../db/data-source')
const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUuid
} = require('../utils/validators')

// 取得教練列表：GET /api/coaches?per=&page=
router.get('/', async (req, res, next) => {
  try {
    const { per, page } = req.query
    const perNum = Number(per)
    const pageNum = Number(page)

    if (
      isUndefined(per) ||
      isUndefined(page) ||
      isNotValidString(per) ||
      isNotValidString(page) ||
      isNotValidInteger(perNum) ||
      isNotValidInteger(pageNum)
    ) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const coachRepo = dataSource.getRepository('Coach')
    const coaches = await coachRepo.find({
      relations: {
        user: true
      },
      order: {
        created_at: 'DESC'
      },
      take: perNum,
      skip: (pageNum - 1) * perNum
    })

    const data = coaches.map(coach => ({
      id: coach.id,
      user_id: coach.user_id,
      name: coach.user ? coach.user.name : '',
      experience_years: coach.experience_years,
      description: coach.description,
      profile_image_url: coach.profile_image_url
    }))

    res.status(200).json({
      status: 'success',
      data
    })
  } catch (error) {
    next(error)
  }
})

// 取得教練詳情：GET /api/coaches/:coachId
router.get('/:coachId', async (req, res, next) => {
  try {
    const { coachId } = req.params
    if (isNotValidUuid(coachId)) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const coachRepo = dataSource.getRepository('Coach')
    const coach = await coachRepo.findOne({
      where: { id: coachId },
      relations: {
        user: true
      }
    })

    if (!coach) {
      return res.status(400).json({
        status: 'failed',
        message: '找不到該教練'
      })
    }

    const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill')
    const skillLinks = await coachLinkSkillRepo.find({
      where: { coach_id: coach.id },
      relations: {
        skill: true
      }
    })

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          name: coach.user ? coach.user.name : '',
          role: coach.user ? coach.user.role : 'COACH'
        },
        coach: {
          id: coach.id,
          user_id: coach.user_id,
          experience_years: coach.experience_years,
          description: coach.description,
          profile_image_url: coach.profile_image_url,
          created_at: coach.created_at,
          updated_at: coach.updated_at,
          skills: skillLinks
            .filter(link => link.skill)
            .map(link => ({
              id: link.skill.id,
              name: link.skill.name
            }))
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

// 取得指定教練的未結束課程列表：GET /api/coaches/:coachId/courses
router.get('/:coachId/courses', async (req, res, next) => {
  try {
    const { coachId } = req.params
    if (isNotValidUuid(coachId)) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const coachRepo = dataSource.getRepository('Coach')
    const coach = await coachRepo.findOne({
      where: { id: coachId },
      relations: {
        user: true
      }
    })

    if (!coach) {
      return res.status(400).json({
        status: 'failed',
        message: '找不到該教練'
      })
    }

    const courseRepo = dataSource.getRepository('Course')
    const courses = await courseRepo.find({
      where: {
        user_id: coach.user_id,
        end_at: MoreThan(new Date())
      },
      relations: {
        skill: true
      },
      order: {
        start_at: 'ASC'
      }
    })

    const data = courses.map(course => ({
      id: course.id,
      coach_name: coach.user ? coach.user.name : '',
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
