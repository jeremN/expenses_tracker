import React, { Component } from 'react';
import { connect } from 'react-redux';

import Aux from '../../hoc/Auxiliary/Auxiliary';

import * as actions from '../../store/actions';
import axios from 'axios';

class Home extends Component {
	render() {
		return (
			<Aux>
				HOME
			</Aux>
		)
	}
}

export default Home;