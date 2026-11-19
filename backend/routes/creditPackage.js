const auth = require('../middlewares/auth')
const express = require('express')
const router = express.Router()
const { dataSource } = require('../db/data-source')
const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUuid
} = require('../utils/validators')

// 取得購買方案列表
router.get('/', async (req, res, next) => {
  try {
    const packageRepo = dataSource.getRepository('CreditPackage')
    const packages = await packageRepo.find({
      select: {
        id: true,
        name: true,
        credit_amount: true,
        price: true
      }
    })
    res.status(200).json({
      status: 'success',
      data: packages
    })
  } catch (error) {
    next(error)
  }
})

// 新增購買方案
router.post('/', async (req, res, next) => {
  try {
    const { name, credit_amount, price } = req.body
    if (
      isUndefined(name) ||
      isNotValidString(name) ||
      name.length > 50 ||
      isUndefined(credit_amount) ||
      isNotValidInteger(credit_amount) ||
      isUndefined(price) ||
      typeof price !== 'number' ||
      isNaN(price) ||
      price < 0
    ) {
      return res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
    }

    const packageRepo = dataSource.getRepository('CreditPackage')
    const existPackage = await packageRepo.findOne({
      where: { name }
    })
    if (existPackage) {
      return res.status(409).json({
        status: 'failed',
        message: '資料重複'
      })
    }

    const newPackage = packageRepo.create({
      name,
      credit_amount,
      price
    })
    const savedPackage = await packageRepo.save(newPackage)

    res.status(200).json({
      status: 'success',
      data: {
        id: savedPackage.id,
        name: savedPackage.name,
        credit_amount: savedPackage.credit_amount,
        price: Number(savedPackage.price)
      }
    })
  } catch (error) {
    next(error)
  }
})

// 刪除購買方案
router.delete('/:creditPackageId', async (req, res, next) => {
  try {
    const { creditPackageId } = req.params
    if (
      isUndefined(creditPackageId) ||
      isNotValidString(creditPackageId) ||
      isNotValidUuid(creditPackageId)
    ) {
      return res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
    }

    const packageRepo = dataSource.getRepository('CreditPackage')
    const result = await packageRepo.delete(creditPackageId)
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

// 會員購買方案：POST /api/credit-package/:creditPackageId
router.post('/:creditPackageId', auth, async (req, res, next) => {
  try {
    const { creditPackageId } = req.params
    if (
      isUndefined(creditPackageId) ||
      isNotValidString(creditPackageId) ||
      isNotValidUuid(creditPackageId)
    ) {
      return res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
    }

    const packageRepo = dataSource.getRepository('CreditPackage')
    const creditPackage = await packageRepo.findOne({
      where: { id: creditPackageId }
    })
    if (!creditPackage) {
      return res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
    }

    const purchaseRepo = dataSource.getRepository('CreditPurchase')
    const newPurchase = purchaseRepo.create({
      user_id: req.user.id,
      credit_package_id: creditPackage.id,
      purchased_credits: creditPackage.credit_amount,
      price_paid: creditPackage.price
    })
    await purchaseRepo.save(newPurchase)

    res.status(201).json({
      status: 'success',
      data: null
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
