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
}

const getUserDataStart = (state, action) => {
	return updateObject(state, {
		error: null,
		loading: true,
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

const getUserDataFail = (state, action) => {
	return updateObject(state, {
		error: action.error,
		loading: false
	});
}

const setUserDataStart = (state, action) => {
	return updateObject(state, {
		error: null,
		loading: true,
	});
}

const setNewUserDataSuccess = (state, action) => {
	return updateObject(state, {
		loading: true,
		error: null
	});
}

const setNewUserDataFail = (state, action) => {
	return updateObject(state, {
		error: action.error,
		loading: false
	});
}

const updateExpenseStart = (state, action) => {
	return updateObject(state, {
		error: null,
		loading: true,
	});
}

const updateExpenseSuccess = (state, action) => {
	return updateObject(state, {
		currentExpenses: action.currentExpenses,
		loading: false
	})
}

const updateExpenseFail = (state, action) => {
	return updateObject(state, {
		error: action.error,
		loading: false
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
		case actionTypes.UPDATE_EXPENSE_START: return updateExpenseStart(state, action);
		case actionTypes.UPDATE_EXPENSE_SUCCESS: return updateExpenseSuccess(state, action);
		case actionTypes.UPDATE_EXPENSE_FAIL: return updateExpenseFail(state, action);
		default:
			return state;
	}
}

export default reducer;