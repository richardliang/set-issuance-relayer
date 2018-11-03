import SetProtocol from 'setprotocol.js';
import history from '../history'
import * as Web3 from 'web3';

const configKovan = {
  coreAddress: '0xc89092a43287c12cfe87c8631b718176ea702d18',
  setTokenFactoryAddress: '0xa4c8d565719fefd8cf79d1178bbf262cbe659af2',
  transferProxyAddress: '0xbe0adf7616da59017e2fe6a38d047e469ad5126e',
  vaultAddress: '0x004cb397d5eb64158cc3f3698b89d46abf8e0cfa',
  rebalancingSetTokenFactoryAddress: '0x07d6ef7a8b0287d6cdcbea21e784b52feccc8dd0',
};

const GET_SET_PROTOCOL = "GET_SET_PROTOCOL"
const REMOVE_SET_PROTOCOL = "REMOVE_SET_PROTOCOL"

const defaultSetProtocol = {}

const getSetProtocol = (setProtocol) => ({type: GET_SET_PROTOCOL, setProtocol})
export const removeSetProtocol = () => ({type: REMOVE_SET_PROTOCOL, setProtocol: {}})

export const fetchSetProtocol = () => async dispatch => {
  const {ethereum, web3} = window
  if(window.web3){    
    try {    
      const web3 = window.web3
      if (!web3) throw new Error("no web3 instance found in runtime");
      const setProtocol = new SetProtocol(web3.currentProvider,configKovan)
      dispatch(getSetProtocol(setProtocol || defaultSetProtocol))
      history.push('/home')
    } catch (err) {
      console.error(err)
    }
  }
  else if(window.ethereum){
    try {    
      
      if (!ethereum) throw new Error("no web3 instance found in runtime");
      const enable = await ethereum.enable()
      const setProtocol = new SetProtocol(enable,configKovan)
      dispatch(getSetProtocol(setProtocol || defaultSetProtocol))
      history.push('/home')
    } catch (err) {
      console.error(err)
    }
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