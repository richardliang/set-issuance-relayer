import history from '../history'
import axios from 'axios'
import BigNumber from 'bignumber.js'

const GET_OPEN_ORDERS = "GET_OPEN_ORDERS"
const POST_NEW_ORDER = "POST_NEW_ORDER"

const defaultOrder = []

const getOpenOrders = (signedIssuanceOrders) => ({type: GET_OPEN_ORDERS, signedIssuanceOrders})
const postNewOrder = (order) => ({type: POST_NEW_ORDER, order})

export const fetchOpenOrders = () => async dispatch => {
  try {
    const res = await axios.get('/api/signedIssuanceOrders')
    const formatted = res.data.map(element => {
      const parsed = JSON.parse(element.signedIssuanceOrder)
      parsed.expiration = new BigNumber(parsed.expiration)
      parsed.makerRelayerFee = new BigNumber(parsed.makerRelayerFee)
      parsed.makerTokenAmount = new BigNumber(parsed.makerTokenAmount)
      parsed.quantity = new BigNumber(parsed.quantity)
      parsed.requiredComponentAmounts = parsed.requiredComponentAmounts.map(comp => new BigNumber(comp))
      parsed.salt = new BigNumber(parsed.salt)
      parsed.takerRelayerFee = new BigNumber(parsed.takerRelayerFee)
      return parsed
    })
    dispatch(getOpenOrders(formatted || defaultOrder))
  } catch (err) {
    console.error(err)
  }
}

export const createNewOrder = (order) => async dispatch => {
  try {
    const res = await axios.post('/api/signedIssuanceOrders',{signedIssuanceOrder: order})
    dispatch(postNewOrder(res.data || defaultOrder))
  } catch (err) {
    console.error(err)
  }
}

export default function(state = defaultOrder, action) {
	switch (action.type) {
		case GET_OPEN_ORDERS:
		  return action.signedIssuanceOrders
    case POST_NEW_ORDER:
      return [...state, action.order]
		default:
		  return state
	}
}