const Sequelize = require('sequelize')
const db = require('../db')

const SignedIssuanceOrders = db.define('signedIssuanceOrders', {
  signedIssuanceOrder: {
    type: Sequelize.TEXT,
    unique: true,
    allowNull: false
  }
})

module.exports = SignedIssuanceOrders
