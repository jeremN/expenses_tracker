import * as actionTypes from '../actions/actionTypes';
import { updateObject } from '../../shared/utility';

const initialState = {
	currentKey: null,
	profile: null,
	expenses: null,
	currentExpenses: null,
	categories: null,
	error: null,
	loading: false,
	loadType: null,
}

const getUserDataStart = (state, action) => {
	return updateObject(state, {
		error: null,
		loading: true,
		loadType: action.loadType,
	});
}

const getUserDataSuccess = (state, action) => {
	return updateObject(state, {
		currentKey: action.currentKey,
		profile: action.profile,
		expenses: action.expenses,
		currentExpenses: action.currentExpenses,
		categories: action.categories,
		loading: false,
		loadType: null,
	});
}

const getUserDataFail = (state, action) => {
	return updateObject(state, {
		error: action.error,
		loading: false,
		loadType: null,
	});
}

const setUserDataStart = (state, action) => {
	return updateObject(state, {
		error: null,
		loading: true,
		loadType: null,
	});
}

const setNewUserDataSuccess = (state, action) => {
	return updateObject(state, {
		loading: true,
		loadType: null,
		error: null
	});
}

const setNewUserDataFail = (state, action) => {
	return updateObject(state, {
		error: action.error,
		loading: false,
		loadType: null,
	});
}

const updateStart = (state, action) => {
	return updateObject(state, {
		error: null,
		loading: true,
		loadType: action.loadType,
	});
}

const updateCurrentExpenseSuccess = (state, action) => {
	return updateObject(state, {
		currentExpenses: action.currentExpenses,
		loading: false,
		loadType: null,
	})
}

const updateFail = (state, action) => {
	return updateObject(state, {
		error: action.error,
		loading: false,
		loadType: null,
	});
}

const reducer = (state = initialState, action) => {
	switch(action.type) {
		case actionTypes.GET_USER_DATA_START: return getUserDataStart(state, action);
		case actionTypes.GET_USER_DATA_FAIL: return getUserDataFail(state, action);
		case actionTypes.GET_USER_DATA_SUCCESS: return getUserDataSuccess(state, action);
		case actionTypes.SET_USER_DATA_START: return setUserDataStart(state, action);
		case actionTypes.SET_NEW_USER_DATA_FAIL: return setNewUserDataFail(state, action);
		case actionTypes.SET_NEW_USER_DATA_SUCCESS: return setNewUserDataSuccess(state, action);
		case actionTypes.UPDATE_START: return updateStart(state, action);
		case actionTypes.UPDATE_CURRENT_EXPENSE_SUCCESS: return updateCurrentExpenseSuccess(state, action);
		case actionTypes.UPDATE_FAIL: return updateFail(state, action);
		default:
			return state;
	}
}

export default reducer;