import * as actionTypes from './actionTypes';
import axios from 'axios';
import { getUserData, setNewUserData } from './payload';

export const authStart = () => {
	return {
		type: actionTypes.AUTH_START
	}
}	

export const logout = () => {
	localStorage.removeItem('expensesTracker');
	return {
		type: actionTypes.AUTH_LOGOUT
	}
}

export const checkAuthTimeout = (expirationTime) => {
	return dispatch => {
		setTimeout(() => {
			dispatch(logout());
		}, expirationTime * 1000);
	}
}

export const authSuccess = (token, userId) => {
	return {
		idToken: token,
		userId: userId,
		type: actionTypes.AUTH_SUCCESS
	}
}

export const authFail = (error) => {
	return {
		type: actionTypes.AUTH_FAIL,
		error: error
	}
}

export const recoverSuccess = () => {
	return {
		type: actionTypes.RECOVER_SUCCESS
	}
}

export const recoverFail = (error) => {
	return {
		type: actionTypes.RECOVER_FAIL,
		error: error
	}
}

export const auth = (email, password, isSignUp, name = '') => {
	return dispatch => {
		dispatch(authStart());
		const authData = {
			email: email,
			password: password,
			returnSecureToken: true
		}

		const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/${!isSignUp ? 'verifyPassword' : 'signupNewUser'}?key=${process.env.REACT_APP_FIREBASE_KEY}`;
			
		axios.post(url, authData)
			.then(response => {
				const { data } = response
				const expirationDate = new Date(new Date().getTime() + data.expiresIn * 1000);
				const localStorageDatas = {
					expireDate: expirationDate,
					token: data.idToken,
					userId: data.localId
				}
				localStorage.setItem('expensesTracker', JSON.stringify(localStorageDatas))
				if (isSignUp) {
					dispatch(setNewUserData(data.localId, data.idToken, email, name));
				}
				dispatch(authSuccess(data.idToken, data.localId));
				dispatch(checkAuthTimeout(data.expiresIn));
			})
			.catch(error => {
				dispatch(authFail(error.response.data.error))
			});
	}
}

export const setAuthRedirectPath = (path) => {
	return {
		type: actionTypes.SET_AUTH_REDIRECT_PATH,
		path: path
	}
}

export const authCheckState = () => {
	return dispatch => {
		const localStorageDatas = localStorage.getItem('expensesTracker')
		if (!localStorageDatas) {
			dispatch(logout())
		} else {
			const { token, userId, expireDate } = JSON.parse(localStorageDatas);
			const expirationDate = new Date(expireDate);

			if (expirationDate <= new Date()) {
				dispatch(logout());
			} else {
				const dateCalc = expirationDate.getTime() - new Date().getTime() / 1000;
				dispatch(authSuccess(token, userId));
				dispatch(getUserData(userId, token));
				dispatch(checkAuthTimeout(dateCalc));
			}
		}
	}
}

export const recoverPassword = (email) => {
	return dispatch => {	
		const recoverData = {
			type: 'PASSWORD_RESET',
			email: email,
		}
		const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.REACT_APP_FIREBASE_KEY}`;

		axios.post(url, recoverData)
			.then(response => {
				dispatch(recoverSuccess());
			})
			.catch(error => {
				dispatch(recoverFail(error.response.data.error));
			});
	}
}