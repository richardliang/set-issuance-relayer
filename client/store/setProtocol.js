import SetProtocol from 'setprotocol.js';
import history from '../history'

const configKovan = {
  coreAddress: '0xdd7d1deb82a64af0a6265951895faf48fc78ddfc',
  setTokenFactoryAddress: '0x7497d12488ee035f5d30ec716bbf41735554e3b1',
  transferProxyAddress: '0xa0929aba843ff1a1af4451e52d26f7dde3d40f82',
  vaultAddress: '0x76aae6f20658f763bd58f5af028f925e7c5319af',
};

const GET_SET_PROTOCOL = "GET_SET_PROTOCOL"
const REMOVE_SET_PROTOCOL = "REMOVE_SET_PROTOCOL"

const defaultSetProtocol = {}

const getSetProtocol = (setProtocol) => ({type: GET_SET_PROTOCOL, setProtocol})
export const removeSetProtocol = () => ({type: REMOVE_SET_PROTOCOL, setProtocol: {}})

export const fetchSetProtocol = () => dispatch => {
  try {
    const web3 = window.web3;
    if (!web3) throw new Error("no web3 instance found in runtime");
    const setProtocol = new SetProtocol(web3.currentProvider,configKovan)
    dispatch(getSetProtocol(setProtocol || defaultSetProtocol))
    history.push('/home')
  } catch (err) {
    console.error(err)
  }
}

export default function(state = defaultSetProtocol, action) {
	switch (action.type) {
		case GET_SET_PROTOCOL:
		return action.setProtocol
		case REMOVE_SET_PROTOCOL:
		return action.setProtocol
		default:
		return state
	}
}