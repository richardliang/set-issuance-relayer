const Sequelize = require('sequelize')
const db = require('../db')

const SetAddresses = db.define('setAddresses', {
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  setAddress: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false
  },
})

module.exports = SetAddresses
