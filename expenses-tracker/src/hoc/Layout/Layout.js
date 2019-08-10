import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import Header from '../../components/Header/Header';
import { dashboard__content } from './Layout.module.css';

class Layout extends Component {
	state = {
		username: ''
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.props.profile !== prevProps.profile && this.props.profile !== null) {
			this.setState({ username: this.props.profile.name });
		}
	}

	render() {		
		return (
			<Fragment>
				<Header isAuth={ this.props.isAuth } userName={ this.state.username } />
				<main className={ dashboard__content }>
					{ this.props.children }
				</main>
			</Fragment>
		)
	}
}

const mapStateToProps = state => {
	return {
		isAuth: state.auth.token !== null,
		profile: state.payload.profile
	}
}

export default connect(mapStateToProps)(Layout);