import SetProtocol from 'setprotocol.js';
import history from '../history'

const configKovan = {
  coreAddress: '0x29f13822ece62b7a436a45903ce6d5c97d6e4cc9',
  setTokenFactoryAddress: '0x6c51d8dad8404dbd91e8ab063d21e85ddec9f626',
  transferProxyAddress: '0xd50ddfed470cc13572c5246e71d4cfb4aba73def',
  vaultAddress: '0x014e9b34486cfa13e9a2d87028d38cd98f996c8c',
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