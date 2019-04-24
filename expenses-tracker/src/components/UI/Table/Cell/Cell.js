import React from 'react';

const cell = (props) => {
	let cellElement = null;

	if (props.type === 'head') {
		cellElement = <th scope="col">{ props.children }</th>;
	} else {
		cellElement = <td>{ props.children }</td>;
	}

	return (cellElement);
}

export default cell;