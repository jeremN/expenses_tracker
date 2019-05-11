import React from 'react';

import Cell from './Cell/Cell';
import './Table.module.scss';

const table = (props) => {
	const { headings, rows, footer } = props;
	console.debug(rows);

	let head = props.headings ? (
		<thead>
			<tr>
				{ props.headings.map((heading, index) => <Cell 
					key={ `thead-${index}` }
					type={ 'head' }>{ heading }</Cell>
				)}
			</tr>
		</thead>
	) : '';

	let body = rows ? (
		<tbody>
			{ rows.map((row, rowIndex) => <tr id={ rowIndex } key={ `row-${rowIndex}` }>
					{ row.map((content, cellIndex) => <Cell 
						key={ `cell-${rowIndex}-${cellIndex}` }>{ content }</Cell>
					)}
				</tr>
			) }
		</tbody>
	) : '';

	// let foot = footer ? (
	// 	<tfooter>
	// 	</tfooter>
	// ) : ''

	return (		
		<table>
			{ head }
			{ body }
		</table>
	);
}

export default table;