import {createStore, combineReducers, applyMiddleware} from 'redux'
import createLogger from 'redux-logger'
import thunkMiddleware from 'redux-thunk'
import {composeWithDevTools} from 'redux-devtools-extension'
import user from './user'
import setProtocol from './setProtocol'
import signedIssuanceOrders from './signedIssuanceOrders'
import setAddresses from './setAddresses'

const reducer = combineReducers({
	user,
	setProtocol,
	signedIssuanceOrders,
	setAddresses
})
const middleware = composeWithDevTools(
  applyMiddleware(thunkMiddleware, createLogger({collapsed: true}))
)
const store = createStore(reducer, middleware)

export default store
export * from './user'
export * from './setProtocol'
export * from './signedIssuanceOrders'
export * from './setAddresses'