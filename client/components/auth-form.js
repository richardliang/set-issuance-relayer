import React from 'react'
import {connect} from 'react-redux'
import PropTypes from 'prop-types'
import {fetchSetProtocol, fetchOpenOrders} from '../store'
import { Grid, Form, Button, Segment, Header, Popup, Icon } from 'semantic-ui-react'


/**
 * COMPONENT
 */
const AuthForm = props => {
  const {name, handleSubmit, error} = props

  return (
    <div>
      <Form onSubmit={handleSubmit} name={name}>
        <Segment basic>
          <Button type="submit">Login with Metamask</Button>
        </Segment>
        {error && error.response && <div> {error.response.data} </div>}
      </Form>
    </div>
  )
}

/**
 * CONTAINER
 *   Note that we have two different sets of 'mapStateToProps' functions -
 *   one for Login, and one for Signup. However, they share the same 'mapDispatchToProps'
 *   function, and share the same Component. This is a good example of how we
 *   can stay DRY with interfaces that are very similar to each other!
 */
const mapLogin = state => {
  return {
    name: 'login',
    displayName: 'Login',
    error: state.user.error
  }
}

const mapDispatch = dispatch => {
  return {
    handleSubmit: (e) => {
      e.preventDefault()
      dispatch(fetchSetProtocol())
      dispatch(fetchOpenOrders())
    }
  }
}

export const Login = connect(mapLogin, mapDispatch)(AuthForm)

/**
 * PROP TYPES
 */
AuthForm.propTypes = {
  name: PropTypes.string.isRequired,
  error: PropTypes.object
}
