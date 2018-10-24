const Sequelize = require('sequelize')
const db = require('../db')

const RebalancingSetAddresses = db.define('rebalancingSetAddresses', {
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  rebalancingSetAddress: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  },
})

module.exports = RebalancingSetAddresses
