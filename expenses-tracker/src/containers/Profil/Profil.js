import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import * as actions from '../../store/actions';

class Profile extends Component {
	state: {

	}

	render() {
		const profil = (<div>Profil</div>)

		return (
			<Fragment>{ profil }</Fragment>
		);
	}
}

const mapStateToProps = state => {
	return {
		loading: state.payload.loading,
		isAuth: state.auth.token !== null,
		token: state.auth.token,
		userId: state.auth.userId,
		currentExpenses: state.payload.currentExpenses,
		currentKey: state.payload.currentKey,
		expenses: state.payload.expenses,
		categories: state.payload.categories,
		canVerifyDatas: state.payload.canVerifyDatas,
	}
}

const mapDispatchToProps = dispatch => {
	return {
		getUserDatas: (userId, token) => dispatch(actions.getUserData(userId, token)),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Profile);