import * as actionTypes from './actionTypes';
import axios from '../../axios-user';

let locale = 'fr';
const formatterMonth = new Intl.DateTimeFormat(locale, {
	month: 'short'
})

export const getUserDataSuccess = (data) => {
	const dataKey = Object.keys(data).map(key => key)
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

export const getUserDataStart = () => {
	return {
		type: actionTypes.GET_USER_DATA_START
	}
}

export const setUserDataStart = () => {
	return {
		type: actionTypes.SET_USER_DATA_START
	}
}

export const getUserDataFail = (error) => {
	return {
		type: actionTypes.GET_USER_DATA_FAIL,
		error: error
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
			}
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
				console.log(response)
				dispatch(getUserDataSuccess(response.data));
			})
			.catch(error => {
				console.log(error)
				dispatch(getUserDataFail(error.response.data.error));
			})
	}
}

export const addNewExpenseSuccess = () => {}

export const addNewExpenseFail = () => {}

export const addNewExpense = (userId, token, key, data) => {
	return dispatch => {	
		axios.put(`users/${userId}/${key}.json?auth=${token}`)
			.then(response => {
				console.info(response);
			})
			.catch(error => {
				console.info(error);
			})
	}
}

