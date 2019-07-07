import React from 'react';

import Cell from './Cell/Cell';
import './Table.module.scss';

const table = (props) => {
	const { headings, rows, footer } = props;

	let head = headings && headings.length ? (
		<thead>
			<tr>
				{ headings.map((heading, index) => <Cell
					key={ `thead-${index}` }
					type={ 'head' }>{ heading }</Cell>
				)}
			</tr>
		</thead>
	) : null ;

	let body = rows && rows.length ? (
		<tbody>
			{ rows.map((row, rowIndex) => <tr id={ rowIndex } key={ `row-${rowIndex}` }>
					{ row.map((content, cellIndex) => <Cell 
						key={ `cell-${rowIndex}-${cellIndex}` }>{ content }</Cell>
					)}
				</tr>
			) }
		</tbody>
	) : null ;

	let foot = footer && footer.length ? (
		<tfoot>
			<tr>
				{ footer.map((foots, index) => <Cell
					key={ `tfoot-${index}` }
					type={ 'foot' }>{ foots }</Cell>
				)}
			</tr>

		</tfoot>
	) : null ;

	return (		
		<table>
			{ head }
			{ body }
			{ foot }
		</table>
	);
}

export default table;