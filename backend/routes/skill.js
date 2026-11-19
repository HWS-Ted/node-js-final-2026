const express = require('express')
const router = express.Router()
const { dataSource } = require('../db/data-source')
const {
  isUndefined,
  isNotValidString,
  isNotValidUuid
} = require('../utils/validators')

// 取得教練技能列表
router.get('/', async (req, res, next) => {
  try {
    const skillRepo = dataSource.getRepository('Skill')
    const skills = await skillRepo.find({
      select: {
        id: true,
        name: true
      }
    })
    res.status(200).json({
      status: 'success',
      data: skills
    })
  } catch (error) {
    next(error)
  }
})

// 新增教練技能
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body
    if (isUndefined(name) || isNotValidString(name) || name.length > 50) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const skillRepo = dataSource.getRepository('Skill')
    const existSkill = await skillRepo.findOne({
      where: { name }
    })
    if (existSkill) {
      return res.status(409).json({
        status: 'failed',
        message: '資料重複'
      })
    }

    const newSkill = skillRepo.create({ name })
    const savedSkill = await skillRepo.save(newSkill)

    res.status(200).json({
      status: 'success',
      data: {
        id: savedSkill.id,
        name: savedSkill.name
      }
    })
  } catch (error) {
    next(error)
  }
})

// 刪除教練技能
router.delete('/:skillId', async (req, res, next) => {
  try {
    const { skillId } = req.params
    if (
      isUndefined(skillId) ||
      isNotValidString(skillId) ||
      isNotValidUuid(skillId)
    ) {
      return res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
    }

    const skillRepo = dataSource.getRepository('Skill')
    const result = await skillRepo.delete(skillId)
    if (result.affected === 0) {
      return res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
    }

    res.status(200).json({
      status: 'success'
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
