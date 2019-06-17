import moment from 'moment';

import { sumArray } from './utility';

export const hasDatesChanged = (data) => {
	if (!data) return;
	const currentDate = moment();
	const currentYear = currentDate.format('YYYY');
	const currentMonth = 'July'//currentDate.format('MMMM');
	const { currentExpenses: prevMonthExpenses, /* expenses: prevExpenses,*/ categories } = data
	const savedMonth = Object.keys(prevMonthExpenses[currentYear]);
	const savedYear = Object.keys(prevMonthExpenses);
	const updatedDatas = {
		expenses: '',
		categories: '',
	}

	if (savedMonth[0] !== currentMonth || savedYear[0] !== currentYear) {
		return {
			categories: formatCategories(prevMonthExpenses[savedYear[0]][savedMonth[0]], categories),
			expenses: formatExpenses(prevMonthExpenses[savedYear[0]][savedMonth[0]], savedMonth[0], savedYear[0])
		}
	}

	return false;
}

export const formatCategories = (currentExpenses, categories) => {
	const updatedCategories = [...categories];
	const currentCategories = [];

	currentExpenses.filter(exp => currentCategories.push(exp.category));
	const uniqCat = [...new Set(currentCategories)];
	return uniqCat;
}

export const formatExpenses = (currentExpenses, monthName, year) => {
	const data = {}
	const years = []

	if (!currentExpenses || currentExpenses === ' ') return {
		[year]: {
			[monthName]: ' '
		}
	}

	currentExpenses.filter(exp => years.push(moment(exp.date, 'YYYY-MM-DD').format('YYYY')));
	const uniqYears = [...new Set(years)]; 
	uniqYears.forEach(year => data[year] = {});

	currentExpenses.forEach((expense) => {
		const dateMonthName = moment(expense.date, 'YYYY-MM-DD').format('MMMM');
		const dateYear = moment(expense.date, 'YYYY-MM-DD').format('YYYY');
		
		if (!Object.keys(data[dateYear]).includes(dateMonthName)) {
			data[dateYear][dateMonthName] = []
		}

		data[dateYear][dateMonthName].push(expense);
	});

	Object.keys(data).forEach(year => {
		Object.keys(data[year]).forEach(month => {
			const formatedData = formatData(data[year][month]);
			const extractedDataKeys = extractDatasKeys(formatedData);
			data[year][month] = processMonth(extractedDataKeys); 
		})
	})

	return data
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
		income: 0,
		outcome: 0,
		diff: 0
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
