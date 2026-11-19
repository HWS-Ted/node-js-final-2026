const jwt = require('jsonwebtoken')
const config = require('../config/index')
const { dataSource } = require('../db/data-source')

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'failed',
        message: '請先登入'
      })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({
        status: 'failed',
        message: '請先登入'
      })
    }

    let decoded
    try {
      decoded = jwt.verify(token, config.get('secret.jwtSecret'))
    } catch (error) {
      return res.status(401).json({
        status: 'failed',
        message: '無效的 token'
      })
    }

    const userRepo = dataSource.getRepository('User')
    const currentUser = await userRepo.findOne({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      where: { id: decoded.id }
    })

    if (!currentUser) {
      return res.status(401).json({
        status: 'failed',
        message: '無效的 token'
      })
    }

    req.user = currentUser
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = auth
