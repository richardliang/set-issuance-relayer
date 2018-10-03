import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import history from '../history'
import { Grid, Modal, Button, Segment, Header, Popup, Icon } from 'semantic-ui-react'

/**
 * COMPONENT
 */
export const UserHome = props => {
  return (
    <Segment basic>
      <Button onClick={()=>history.push("/stable-set-component")}>Go to StableSet Trading</Button>
    </Segment>
  )
}

/**
 * CONTAINER
 */
const mapState = state => {
  return {
    email: state.user.email
  }
}

export default connect(mapState)(UserHome)

/**
 * PROP TYPES
 */
UserHome.propTypes = {
}
