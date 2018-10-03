const router = require('express').Router()
const {SignedIssuanceOrders} = require('../db/models')
module.exports = router

router.get('/', async (req, res, next) => {
  try {
    const orders = await SignedIssuanceOrders.findAll()
    res.json(orders)
  } catch (err) {
    next(err)
  }
})

router.get('/:orderId', async (req, res, next) => {
  try {
    const order = await SignedIssuanceOrders.findById(req.params.orderId)
    res.json(order)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const orders = await SignedIssuanceOrders.create(req.body)
    res.json(orders)
  } catch (err) {
    next(err)
  }
})

router.delete('/:orderId', async (req, res, next) => {
  try {
    await SignedIssuanceOrders.destroy({where: {id: req.params.orderId}})
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})