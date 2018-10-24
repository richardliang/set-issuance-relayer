import history from '../history'
import axios from 'axios'
import BigNumber from 'bignumber.js'

const GET_REBALANCING_ADDRESSES = "GET_REBALANCING_ADDRESSES"
const POST_REBALANCING_ADDRESSES = "POST_REBALANCING_ADDRESSES"

const defaultAddresses = []

const getRebalancingAddresses = (rebalancingSetAddresses) => ({type: GET_REBALANCING_ADDRESSES, rebalancingSetAddresses})
const postRebalancingAddresses = (rebalancingSetAddress) => ({type: POST_REBALANCING_ADDRESSES, rebalancingSetAddress})

export const fetchRebalancingSetAddresses = () => async dispatch => {
  try {
    const res = await axios.get('/api/rebalancingSetAddresses')
    dispatch(getRebalancingAddresses(res.data || defaultAddresses))
  } catch (err) {
    console.error(err)
  }
}

export const createRebalancingSetAddress = (name, rebalancingSetAddress) => async dispatch => {
  try {
    const res = await axios.post('/api/rebalancingSetAddresses',{name, rebalancingSetAddress})
    dispatch(postRebalancingAddresses(res.data || defaultAddresses))
  } catch (err) {
    console.error(err)
  }
}


export default function(state = defaultAddresses, action) {
  switch (action.type) {
    case GET_REBALANCING_ADDRESSES:
      return action.rebalancingSetAddresses
    case POST_REBALANCING_ADDRESSES:
      return [...state, action.rebalancingSetAddress]
    default:
      return state
  }
}