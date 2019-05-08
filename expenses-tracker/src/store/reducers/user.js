import * as actionTypes from '../actions/actionTypes';
import { updateObject } from '../../shared/utility';

const initialState = {
	currentKey: null,
	profile: {},
	expenses: {},
	currentExpenses: [],
	categories: [],
	error: null,
	loading: false,
}

const getUserDataFail = (state, action) => {
	return updateObject(state, {
		error: action.error,
		loading: false
	});
}

const getUserDataSuccess = (state, action) => {
	return updateObject(state, {
		currentKey: action.currentKey,
		profile: action.profile,
		expenses: action.expenses,
		currentExpenses: action.currentExpenses,
		categories: action.categories,
		loading: false
	});
}

const setNewUserDataFail = (state, action) => {
	return updateObject(state, {
		error: action.error,
		loading: false
	});
}

const setNewUserDataSuccess = (state, action) => {
	return updateObject(state, {
		loading: true,
		error: null
	});
}

const setUserDataStart = (state, action) => {
	return updateObject(state, {
		error: null,
		loading: true,
	});
}

const getUserDataStart = (state, action) => {
	return updateObject(state, {
		error: null,
		loading: true,
	});
}

const reducer = (state = initialState, action) => {
	switch(action.type) {
		case actionTypes.SET_USER_DATA_START: return setUserDataStart(state, action);
		case actionTypes.GET_USER_DATA_START: return getUserDataStart(state, action);
		case actionTypes.GET_USER_DATA_FAIL: return getUserDataFail(state, action);
		case actionTypes.GET_USER_DATA_SUCCESS: return getUserDataSuccess(state, action);
		case actionTypes.SET_NEW_USER_DATA_FAIL: return setNewUserDataFail(state, action);
		case actionTypes.SET_NEW_USER_DATA_SUCCESS: return setNewUserDataSuccess(state, action);
		default:
			return state;
	}
}

export default reducer;