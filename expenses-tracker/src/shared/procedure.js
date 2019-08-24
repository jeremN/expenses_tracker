import moment from 'moment';

import { sumArray, getDate } from './utility';

export const hasDatesChanged = (data) => {
	console.info(data)
	if (!data) return false;
	const dates = getDate()
	const { notif: currentNotif, currentExpenses: prevMonthExpenses, expenses: prevExpenses, categories } = data

	if (!prevMonthExpenses) return false;
	const savedMonth = Object.keys(prevMonthExpenses[dates.currentYear]);
	const savedYear = Object.keys(prevMonthExpenses);
	
	if (savedMonth[0] !== dates.currentMonth || savedYear[0] !== dates.currentYear) {
		const currentExp = prevMonthExpenses[savedYear[0]][savedMonth[0]]
		const newExpenses = formatExpenses(currentExp, savedMonth[0], savedYear[0])

		return {
			formattedNotif: formatNotif(currentNotif),
			formattedCat: formatCategories(currentExp, categories),
			formattedExp: hasExistingEntries(newExpenses, prevExpenses),
			currentExp: {
				[dates.currentYear]: {
					[dates.currentMonth]: ' '
				}
			}
		}
	}

	return false;
}

const formatNotif = (currentNotif) => {
	const updatedNotifs = !currentNotif ? [] : [...currentNotif];

	updatedNotifs.push(`${moment().format('DD/MMM/YYYY')}`);
	return updatedNotifs;
}

const formatCategories = (currentExpenses, categories) => {
	if (!categories) return [];
	const updatedCategories = [...categories];

	currentExpenses.filter(exp => updatedCategories.push(exp.category));
	const uniqCat = [...new Set(updatedCategories)];
	return uniqCat;
}

const formatExpenses = (currentExpenses, monthName, year) => {
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

const formatData = (array) => {
	return array.map( item => {
		return {
			value: Number(item.value),
			category: item.category,
			type: item.type,
			date: item.date
		}
	});
}

const processMonth = (reducedArray) => {
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
				month.income = reducedArray[key] ? parseFloat(sumArray(reducedArray[key]).toFixed(2)) : 0
				break;
			case 'outcome':
				month.outcome = reducedArray[key] ? parseFloat(sumArray(reducedArray[key]).toFixed(2)) : 0
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

const extractDatasKeys = (arr) => arr.reduce((item, next) => {
	let cat = next.category 
	let type = next.type
	
	if( !item[cat] ) item[cat] = []
	if( !item[type] ) item[type] = []

	item[cat].push(next.value)
	item[type].push(next.value)

	return item
}, {});

const hasExistingEntries = (newProps, oldProps) => {
	let summedProps = {}

	if (Object.keys(newProps).length) {
		Object.keys(newProps).forEach(year => {

			Object.keys(newProps[year]).forEach(month => {
				if (Object.keys(oldProps).includes(year) && Object.keys(oldProps[year]).includes(month)) {
					const { 
						income: newIncome, 
						diff: newDiff, 
						saved: newSaved, 
						outcome: newOutcome, 
						categories: newCat, 
					} = newProps[year][month];

					const { 
						income: oldIncome, 
						diff: oldDiff, 
						saved: oldSaved, 
						outcome: oldOutcome, 
						categories: oldCat, 
					} = oldProps[year][month];

					newProps[year][month] = {
						income: oldIncome + newIncome,
						outcome: oldOutcome + newOutcome,
						diff: oldDiff + newDiff,
						saved: oldSaved + newSaved,
						categories: sumCategories(oldCat, newCat),
					}
				}
			});

			summedProps[year] = {
				...oldProps[year],
				...newProps[year],
			}
		});

		return summedProps;
	}
}

const sumCategories = (oldCat, newCat) => {
	const mergedCat = [...oldCat, ...newCat];
	const updatedCat = mergedCat.reduce((item, next, currentIndex) => {
		const index = item.findIndex(cat => cat.name === next.name)
		index < 0 ? item.push(next) : item[index].value += next.value
		return item;
	}, []);

	return updatedCat;
}
