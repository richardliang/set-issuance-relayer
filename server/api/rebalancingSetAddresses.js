const router = require('express').Router()
const {RebalancingSetAddresses} = require('../db/models')
module.exports = router

router.get('/', async (req, res, next) => {
  try {
    const addresses = await RebalancingSetAddresses.findAll()
    res.json(addresses)
  } catch (err) {
    next(err)
  }
})

router.get('/:addressId', async (req, res, next) => {
  try {
    const order = await RebalancingSetAddresses.findById(req.params.addressId)
    res.json(order)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const addresses = await RebalancingSetAddresses.create(req.body)
    res.json(addresses)
  } catch (err) {
    next(err)
  }
})

router.delete('/:addressId', async (req, res, next) => {
  try {
    await RebalancingSetAddresses.destroy({where: {id: req.params.addressId}})
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})