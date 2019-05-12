import * as actionTypes from './actionTypes';
import axios from '../../axios-user';

let locale = 'fr';
const formatterMonth = new Intl.DateTimeFormat(locale, {
	month: 'short'
})

export const getUserDataStart = () => {
	return {
		type: actionTypes.GET_USER_DATA_START
	}
}

export const getUserDataSuccess = (data) => {
	const dataKey = Object.keys(data).map(key => key)[0]
	const { profile, expenses, currentExpenses, categories } = data[dataKey]
	return {
		profile,
		expenses,
		currentExpenses,
		categories,
		currentKey: dataKey,
		type: actionTypes.GET_USER_DATA_SUCCESS
	}
}

export const getUserDataFail = (error) => {
	return {
		type: actionTypes.GET_USER_DATA_FAIL,
		error: error
	}
}

export const setUserDataStart = () => {
	return {
		type: actionTypes.SET_USER_DATA_START
	}
}

export const setNewUserDataSuccess = () => {
	return {
		type: actionTypes.SET_NEW_USER_DATA_SUCCESS
	}
}

export const setNewUserDataFail = (error) => {
	return {
		type: actionTypes.SET_NEW_USER_DATA_FAIL,
		error: error
	}
}

export const updateExpenseStart = () => {
	return {
		type: actionTypes.UPDATE_EXPENSE_START
	}
}

export const updateExpenseSuccess = (data) => {
	return {
		currentExpenses: data,
		type: actionTypes.UPDATE_EXPENSE_SUCCESS
	}
}

export const updateExpenseFail = (error) => {
	return {
		type: actionTypes.UPDATE_EXPENSE_FAIL,
		error: error
	}
}

export const setNewUserData = (userId, token) => {
	return dispatch => {	
		dispatch(setUserDataStart())
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();
		const currentMonth = formatterMonth.format(currentDate);
		const newUserData = {
			profile: {
				created: currentDate,
				name: '',
				verified: false,
				currency: ''
			}, 
			expenses: '',
			currentExpenses: '',
			categories: ''
		}

		axios.post(`users/${userId}.json?auth=${token}`, newUserData)
			.then(response => {
				console.log(response)
				dispatch(setNewUserDataSuccess(response));
				dispatch(getUserData(userId, token));
			})
			.catch(error => {
				console.log(error)
				dispatch(setNewUserDataFail(error.response.data.error));
			})
	}
}

export const getUserData = (userId, token) => {
	return dispatch => {
		dispatch(getUserDataStart())
		axios.get(`users/${userId}.json?auth=${token}`)
			.then(response => {
				dispatch(getUserDataSuccess(response.data));
			})
			.catch(error => {
				console.log(error)
				dispatch(getUserDataFail(error.response.data.error));
			})
	}
}

export const updateExpense = (userId, token, key, datas) => {
	return dispatch => {	
		dispatch(updateExpenseStart());
		axios.put(`users/${userId}/${key}/currentExpenses.json?auth=${token}`, datas)
			.then(response => {
				dispatch(updateExpenseSuccess(response.data));
			})
			.catch(error => {
				console.error(error);
				dispatch(updateExpenseFail(error.response.data.error));
			})
	}
}

