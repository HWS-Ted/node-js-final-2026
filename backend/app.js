const express = require('express')
const cors = require('cors')
const config = require('./config/index')
const { dataSource } = require('./db/data-source')

const skillRouter = require('./routes/skill')
const creditPackageRouter = require('./routes/creditPackage')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/healthcheck', (req, res) => {
  if (!dataSource.isInitialized) {
    return res.status(503).send('Database not ready')
  }
  res.status(200).send('OK')
})

app.use('/api/coaches/skill', skillRouter)
app.use('/api/credit-package', creditPackageRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({
    status: 'error',
    message: '伺服器發生錯誤'
  })
})

const port = config.get('web.port')

async function startServer() {
  try {
    await dataSource.initialize()
    console.log('資料庫連線並自動建表成功')
    app.listen(port, () => {
      console.log(`伺服器運作中：http://localhost:${port}`)
    })
  } catch (error) {
    console.error('資料庫連線失敗:', error)
    process.exit(1)
  }
}

startServer()
