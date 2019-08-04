import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import Header from '../../components/Header/Header';
import { dashboard__content } from './Layout.module.css';

class Layout extends Component {
	render() {		
		return (
			<Fragment>
				<Header isAuth={this.props.isAuth} />
				<main className={ dashboard__content }>
					{ this.props.children }
				</main>
			</Fragment>
		)
	}
}

const mapStateToProps = state => {
	return {
		isAuth: state.auth.token !== null
	}
}

export default connect(mapStateToProps)(Layout);