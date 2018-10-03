const Sequelize = require('sequelize')
const db = require('../db')

const TokenAddresses = db.define('tokenAddresses', {
  name: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  },
  address: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  }
})

module.exports = TokenAddresses
