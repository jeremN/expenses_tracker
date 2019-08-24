import * as actionTypes from './actionTypes';
import axios from '../../axios-user';
import moment from 'moment';
import { getDate } from '../../shared/utility';

export const getUserDataStart = () => {
	return {
		type: actionTypes.GET_USER_DATA_START
	}
}

export const getUserDataSuccess = (data, userInfo) => {
	const dataKey = Object.keys(data).map(key => key)[0]
	const { profile, expenses, currentExpenses, categories } = data[dataKey]

	return {
		profile,
		expenses,
		currentExpenses,
		categories,
		currentKey: dataKey,
		loadType: 'general',
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

export const updateCurrentExpenseSuccess = ({ data }) => {
	return {
		currentExpenses: data,
		type: actionTypes.UPDATE_CURRENT_EXPENSE_SUCCESS
	}
}

export const updateExpenseSuccess = ({ data }) => {
	return {
		expenses: data,
		type: actionTypes.UPDATE_EXPENSE_SUCCESS,
	}
}

export const updateCategoriesSuccess = ({ data }) => {
	return {
		categories: data, 
		type: actionTypes.UPDATE_CATEGORIES_SUCCESS,
	}
}

export const updateNotificationsSuccess = ({data}) => {
	return {
		notif: data,
		type: actionTypes.UPDATE_NOTIF_SUCCESS,
	}
}

export const updateProfileSuccess = ({ data }) => {
	return {
		profile: data,
		type: actionTypes.UPDATE_PROFILE_SUCCESS,
	}
}

export const updateStart = (loadType) => {
	return {
		type: actionTypes.UPDATE_START,
		loadType: loadType
	}
}

export const datasVerified = (isVerified) => {
	return {
		type: actionTypes.DATAS_VERIFIED,
		canVerifyDatas: isVerified,
	}
}

export const showAlert = (show = false) => {}

export const updateFail = (error) => {
	return {
		type: actionTypes.UPDATE_FAIL,
	}
}

export const setNewUserData = (userId, token, email, name) => {
	return dispatch => {	
		dispatch(setUserDataStart())
		const dates = getDate()

		const newUserData = {
			profile: {
				email: email,
				created: moment(),
				name: name,
				verified: false,
				currency: 'euros'
			}, 
			expenses: {
				[dates.currentYear]: '',
			},
			currentExpenses: {
				[dates.currentYear]: {
					[dates.currentMonth]: ' '
				},
			},
		}

		axios.post(`users/${userId}.json?auth=${token}`, newUserData)
			.then(response => {
				dispatch(setNewUserDataSuccess(response));
				dispatch(getUserData(userId, token));
			})
			.catch(error => {
				console.error(error, error.response)
				dispatch(setNewUserDataFail());
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
				console.error(error, error.response)
				dispatch(getUserDataFail());
			})
	}
}

export const updateCurrentExpenses = (userId, token, key, datas) => {
	return dispatch => {	
		dispatch(updateStart('currentExpenses'));
		axios.put(`users/${userId}/${key}/currentExpenses.json?auth=${token}`, datas)
			.then(response => {
				dispatch(updateCurrentExpenseSuccess(response));
			})
			.catch(error => {
				console.error(error.response);
				dispatch(updateFail());
			})
	}
}

export const updateExpenses = (userId, token, key, datas, loadType = null) => {
	return dispatch => {	
		dispatch(updateStart(loadType));
		axios.put(`users/${userId}/${key}/expenses.json?auth=${token}`, datas)
			.then(response => {
				dispatch(updateExpenseSuccess(response));
			})
			.catch(error => {
				console.error(error.response);
				dispatch(updateFail());
			})
	}
}

export const updateCategories = (userId, token, key, datas) => {
	return dispatch => {
		dispatch(updateStart());
		axios.put(`users/${userId}/${key}/categories.json?auth=${token}`, datas)
			.then(response => {
				dispatch(updateCategoriesSuccess(response));
			})
			.catch(error => {
				console.error(error.response)
				dispatch(updateFail());
			})
	}
}

export const updateNotifications = (userId, token, key, datas) => {
	return dispatch => {
		dispatch(updateStart());
		axios.put(`users/${userId}/${key}/notif.json?auth=${token}`, datas)
			.then(response => {
				dispatch(updateNotificationsSuccess(response));
			})
			.catch(error => {
				console.error(error.response)
				dispatch(updateFail());
			})
	}
}

export const updateProfile = (userId, token, key, datas) => {
	return dispatch => {
		dispatch(updateStart());
		axios.put(`users/${userId}/${key}/profile.json?auth=${token}`, datas)
			.then(response => {
				dispatch(updateProfileSuccess(response));
			})
			.catch(error => {
				console.error(error.response);
				dispatch(updateFail());
			})
	}
}

export const updateUserEmail = (userId, token, key, newEmail, datas) => {
	return dispatch => {
		dispatch(updateStart());
		axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${process.env.REACT_APP_FIREBASE_KEY}`, {
			'idToken': token,
			'email': newEmail,
			'returnSecureToken': true,
		})
			.then(response => {
				dispatch(updateProfile(userId, token, key, datas))
			})
			.catch(error => {
				console.error(error);
				dispatch(updateFail(error.response.data.error));
			})
	}
}

export const updateUserPassword = (userId, token, key, newPassword, datas) => {
	return dispatch => {
		dispatch(updateStart());
		axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${process.env.REACT_APP_FIREBASE_KEY}`, {
			'idToken': token,
			'password': newPassword,
			'returnSecureToken': true,
		})
			.then(response => {
				dispatch(updateProfile(userId, token, key, datas))
				console.info(response);
			})
			.catch(error => {
				console.error(error);
				dispatch(updateFail(error.response.data.error));
			})
	}
}

export const isDatasVerified = (isVerified) => {
	return dispatch => {
		dispatch(datasVerified(isVerified))
	}
}
