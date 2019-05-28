import moment from 'moment';

import { sumArray } from './utility';

export const hasDatesChanged = (data) => {
	const currentDate = moment();
	const currentYear = currentDate.format('YYYY');
	const currentMonth = 'June'//currentDate.format('MMMM');
	const { expenses: prevExpenses, currentExpenses: prevMonthExpenses, categories } = data
	const savedMonth = Object.keys(prevMonthExpenses[currentYear]);
	const savedYear = Object.keys(prevMonthExpenses);
	
	if (savedYear[0] !== currentYear) {

	}

	if (savedMonth[0] !== currentMonth) {
		return monthHasChanged(prevMonthExpenses[currentYear][savedMonth[0]], savedMonth[0]);
	}
}

export const monthHasChanged = (currentExpenses, monthName) => {
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

	return datas
}

export const formatData = (array) => {
	return array.map( item => {
		return {
			value: Number(item.value),
			category: item.category,
			type: item.type,
			date: item.date
		}
	});
}

export const processMonth = (reducedArray) => {
	const month = {
		categories: [],
		saved: 0,
		income: '',
		outcome: '',
		diff: ''
	}

	Object.keys(reducedArray).forEach((key) => {
		switch(key) {
			case 'income':
				month.income = parseFloat(sumArray(reducedArray[key]).toFixed(2))
				break;
			case 'outcome':
				month.outcome = parseFloat(sumArray(reducedArray[key]).toFixed(2))
				break;
			default: 
				month.categories.push({
					name: key,
					value: sumArray(reducedArray[key])
				});
				return;
		}
	});

	month.diff = month.income - month.outcome;

	return month;
}

export const extractDatasKeys = (arr) => arr.reduce((item, next) => {
	let cat = next.category 
	let type = next.type
	
	if( !item[cat] ) item[cat] = []
	if( !item[type] ) item[type] = []

	item[cat].push(next.value)
	item[type].push(next.value)

	return item
}, {});
