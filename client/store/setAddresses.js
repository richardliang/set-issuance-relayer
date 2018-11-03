import history from '../history'
import axios from 'axios'

const GET_ADDRESSES = "GET_ADDRESSES"
const POST_ADDRESSES = "POST_ADDRESSES"

const defaultAddresses = []

const getAddresses = (setAddresses) => ({type: GET_ADDRESSES, setAddresses})
const postAddresses = (setAddress) => ({type: POST_ADDRESSES, setAddress})

export const fetchSetAddresses = () => async dispatch => {
  try {
    const res = await axios.get('/api/setAddresses')
    dispatch(getAddresses(res.data || defaultAddresses))
  } catch (err) {
    console.error(err)
  }
}

export const createSetAddress = (name, setAddress) => async dispatch => {
  try {
    const res = await axios.post('/api/setAddresses',{name, setAddress})
    dispatch(postAddresses(res.data || defaultAddresses))
  } catch (err) {
    console.error(err)
  }
}


export default function(state = defaultAddresses, action) {
  switch (action.type) {
    case GET_ADDRESSES:
      return action.setAddresses
    case POST_ADDRESSES:
      return [...state, action.setAddress]
    default:
      return state
  }
}