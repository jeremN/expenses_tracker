import { sumArray } from './utility';

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
	console.info(reducedArray)

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
