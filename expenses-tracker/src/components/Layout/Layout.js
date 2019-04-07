import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

class Layout extends Component {
	render() {
	
		let sideNav = ''
		let header = (
			<header>
				Unauhenticated header
			</header>
		)

		if (this.props.isAuth) {
			header = (
				<header>
					Authenticated header
				</header>
			)

			sideNav = (
				<nav>
					Side nav
				</nav>
			)
		}

		return (
			<Fragment>
				{ header }
				{ sideNav }
				<main>
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