import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import * as d3 from 'd3';

import Chart from '../../components/Charts/Chart';

import * as actions from '../../store/actions';
import { updateObject, getDate } from '../../shared/utility';

class Statistics extends Component {
	state = {

	}

	componentDidMount() {
		console.info(this.props.expenses)
	}


	render() {
		const statContent = (
			<Fragment>
				<div className="row">
					<h1 className="content__title">Statistics</h1>
				</div>
				<div className="row">
					<div className="col-8 card">

					</div>
					<div className="">
						
					</div>
				</div>
				<div className="row">
					<div className="col-12 card">
						<Chart />
					</div>
				</div>
			</Fragment>
		);

		return (
			<Fragment>{ statContent }</Fragment>
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
		onUpdateCurrentExpense: (userId, token, key, datas) => dispatch(actions.updateCurrentExpenses(userId, token, key, datas)),
		onUpdateExpenses: (userId, token, key, datas) => dispatch(actions.updateExpenses(userId, token, key, datas)),
		onUpdateCategories: (userId, token, key, datas) => dispatch(actions.updateCategories(userId, token, key, datas)),
		verifyDatesHandler: (verified) => dispatch(actions.isDatasVerified(verified)),
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Statistics);