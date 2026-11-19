function isCoach(req, res, next) {
  if (!req.user || req.user.role !== 'COACH') {
    return res.status(401).json({
      status: 'failed',
      message: '使用者尚未成為教練'
    })
  }
  next()
}

module.exports = isCoach
