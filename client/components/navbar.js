import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import {Link} from 'react-router-dom'
import {removeSetProtocol} from '../store'

const Navbar = ({handleClick, setProtocol}) => (
  <div>
    <h1>Issuance Relayer</h1>
    <nav>
      {setProtocol.web3 && (
        <div>
          {/* The navbar will show these links after you log in */}
          <Link to="/home">Home</Link>
          <a href="#" onClick={handleClick}>
            Logout
          </a>
        </div>
      )}
    </nav>
    <hr />
  </div>
)

/**
 * CONTAINER
 */
const mapState = state => {
  return {
    setProtocol: state.setProtocol
  }
}

const mapDispatch = dispatch => {
  return {
    handleClick() {
      dispatch(removeSetProtocol())
    }
  }
}

export default connect(mapState, mapDispatch)(Navbar)

/**
 * PROP TYPES
 */
Navbar.propTypes = {
  handleClick: PropTypes.func.isRequired,
}
