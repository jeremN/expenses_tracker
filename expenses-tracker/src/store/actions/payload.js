import * as actionTypes from './actionTypes';
import axios from '../../axios-user';
import moment from 'moment';
import { formatData, processMonth, extractDatasKeys } from '../../shared/procedure';

const locale = 'en-us';
const formatterMonth = new Intl.DateTimeFormat(locale, {
	month: 'long'
});
const digitMonth = new Intl.DateTimeFormat(locale, {
	month: '2-digit'
});

export const getUserDataStart = () => {
	return {
		type: actionTypes.GET_USER_DATA_START
	}
}

export const getUserDataSuccess = (data, userInfo) => {
	const dataKey = Object.keys(data).map(key => key)[0]
	const { profile, expenses, currentExpenses, categories } = data[dataKey]
	hasDatesChanged(data[dataKey], {
		...userInfo,
		key: dataKey,
	});
	return {
		profile,
		expenses,
		currentExpenses,
		categories,
		currentKey: dataKey,
		type: actionTypes.GET_USER_DATA_SUCCESS
	}
}

export const hasDatesChanged = (data, requestInfo) => {
	const currentDate = moment();
	const currentYear = currentDate.format('YYYY');
	const currentMonth = 'June'//currentDate.format('MMMM');
	const { expenses: prevExpenses, currentExpenses: prevMonthExpenses, categories } = data
	const savedMonth = Object.keys(prevMonthExpenses[currentYear]);
	const savedYear = Object.keys(prevMonthExpenses);
	console.info(savedYear)
	
	if (savedYear[0] !== currentYear) {

	}

	if (savedMonth[0] !== currentMonth) {
		monthHasChanged(prevMonthExpenses[currentYear][savedMonth[0]], savedMonth[0]);
	}
}

const yearHasChanged = () => {

}

const monthHasChanged = (currentExpenses, monthName) => {
	const anotherMonth = [];
	const prevMonthDatas = [];

	currentExpenses.forEach((expense, index) => {
		const dateMonthName = moment(expense.date, 'YYYY-MM-DD').format('MMMM')
		if (dateMonthName !== monthName) {
			anotherMonth.push(expense);
		} else {
			prevMonthDatas.push(expense);
		}
	});

	const formatedData = formatData(prevMonthDatas);
	const extractedDataKeys = extractDatasKeys(formatedData);
	const datas = processMonth(extractedDataKeys);
	console.info(datas)

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

export const updateCurrentExpenseSuccess = (data) => {
	return {
		currentExpenses: data,
		type: actionTypes.UPDATE_CURRENT_EXPENSE_SUCCESS
	}
}

export const updateStart = (loadType) => {
	return {
		type: actionTypes.UPDATE_START,
		loadType: loadType
	}
}

export const updateExpenseSuccess = (data) => {
	return {
		type: actionTypes.UPDATE_EXPENSE_SUCCESS,
	}
}

export const updateFail = (error) => {
	return {
		type: actionTypes.UPDATE_FAIL,
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
			expenses: {
				[currentYear]: '',
			},
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
				dispatch(getUserDataSuccess(response.data, { userId: userId, token: token }));
			})
			.catch(error => {
				console.log(error)
				dispatch(getUserDataFail(error.response.data.error));
			})
	}
}

export const updateCurrentExpenses = (userId, token, key, datas) => {
	return dispatch => {	
		dispatch(updateStart('currentExpenses'));
		axios.put(`users/${userId}/${key}/currentExpenses.json?auth=${token}`, datas)
			.then(response => {
				dispatch(updateCurrentExpenseSuccess(response.data));
			})
			.catch(error => {
				console.error(error);
				dispatch(updateFail(error.response.data.error));
			})
	}
}

export const updateExpense = (userId, token, key, datas) => {
	return dispatch => {	
		dispatch(updateStart('expenses'));
		axios.put(`users/${userId}/${key}/expenses.json?auth=${token}`, datas)
			.then(response => {
				dispatch(updateExpenseSuccess(response.data));
			})
			.catch(error => {
				console.error(error);
				dispatch(updateFail(error.response.data.error));
			})
	}
}
