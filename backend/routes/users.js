const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const router = express.Router()

const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const auth = require('../middlewares/auth')
const {
  isUndefined,
  isNotValidString,
  isValidPassword,
  isValidEmail
} = require('../utils/validators')

const saltRounds = 10

// 註冊：POST /api/users/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (
      isUndefined(name) ||
      isNotValidString(name) ||
      name.length > 50 ||
      isUndefined(email) ||
      isNotValidString(email) ||
      !isValidEmail(email) ||
      isUndefined(password) ||
      isNotValidString(password)
    ) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        status: 'failed',
        message: '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
      })
    }

    const userRepo = dataSource.getRepository('User')
    const existUser = await userRepo.findOne({
      where: { email }
    })

    if (existUser) {
      return res.status(409).json({
        status: 'failed',
        message: 'Email 已被使用'
      })
    }

    const hashPassword = await bcrypt.hash(password, saltRounds)
    const newUser = userRepo.create({
      name,
      email,
      password: hashPassword,
      role: 'USER'
    })
    const savedUser = await userRepo.save(newUser)

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: savedUser.id,
          name: savedUser.name
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

// 登入：POST /api/users/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (
      isUndefined(email) ||
      isNotValidString(email) ||
      isUndefined(password) ||
      isNotValidString(password)
    ) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        status: 'failed',
        message: '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
      })
    }

    const userRepo = dataSource.getRepository('User')
    const existUser = await userRepo.findOne({
      select: {
        id: true,
        name: true,
        password: true,
        role: true
      },
      where: { email }
    })

    if (!existUser) {
      return res.status(400).json({
        status: 'failed',
        message: '使用者不存在或密碼輸入錯誤'
      })
    }

    const isMatch = await bcrypt.compare(password, existUser.password)
    if (!isMatch) {
      return res.status(400).json({
        status: 'failed',
        message: '使用者不存在或密碼輸入錯誤'
      })
    }

    const token = jwt.sign(
      {
        id: existUser.id,
        role: existUser.role
      },
      config.get('secret.jwtSecret'),
      {
        expiresIn: config.get('secret.jwtExpiresDay')
      }
    )

    res.status(201).json({
      status: 'success',
      data: {
        token,
        user: {
          name: existUser.name
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

// 取得個人資料：GET /api/users/profile
router.get('/profile', auth, async (req, res, next) => {
  try {
    const { email, name } = req.user
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          email,
          name
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

// 更新個人資料：PUT /api/users/profile
router.put('/profile', auth, async (req, res, next) => {
  try {
    const { name } = req.body
    if (isUndefined(name) || isNotValidString(name) || name.length > 50) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const userRepo = dataSource.getRepository('User')
    const updateResult = await userRepo.update({ id: req.user.id }, { name })

    if (updateResult.affected === 0) {
      return res.status(400).json({
        status: 'failed',
        message: '更新使用者資料失敗'
      })
    }

    res.status(200).json({
      status: 'success'
    })
  } catch (error) {
    next(error)
  }
})

// 修改密碼：PUT /api/users/password
router.put('/password', auth, async (req, res, next) => {
  try {
    const { password, new_password, confirm_new_password } = req.body
    if (
      isUndefined(password) ||
      isNotValidString(password) ||
      isUndefined(new_password) ||
      isNotValidString(new_password) ||
      isUndefined(confirm_new_password) ||
      isNotValidString(confirm_new_password)
    ) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    if (
      !isValidPassword(password) ||
      !isValidPassword(new_password) ||
      !isValidPassword(confirm_new_password)
    ) {
      return res.status(400).json({
        status: 'failed',
        message: '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
      })
    }

    if (new_password === password) {
      return res.status(400).json({
        status: 'failed',
        message: '新密碼不能與舊密碼相同'
      })
    }

    if (new_password !== confirm_new_password) {
      return res.status(400).json({
        status: 'failed',
        message: '新密碼與驗證新密碼不一致'
      })
    }

    const userRepo = dataSource.getRepository('User')
    const existUser = await userRepo.findOne({
      select: {
        id: true,
        password: true
      },
      where: { id: req.user.id }
    })

    const isMatch = await bcrypt.compare(password, existUser.password)
    if (!isMatch) {
      return res.status(400).json({
        status: 'failed',
        message: '密碼輸入錯誤'
      })
    }

    const hashPassword = await bcrypt.hash(new_password, saltRounds)
    const updateResult = await userRepo.update(
      { id: req.user.id },
      { password: hashPassword }
    )

    if (updateResult.affected === 0) {
      return res.status(400).json({
        status: 'failed',
        message: '更新密碼失敗'
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
