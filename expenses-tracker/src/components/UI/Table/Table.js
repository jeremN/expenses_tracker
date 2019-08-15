import React, { Fragment } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

import Cell from './Cell/Cell';
import classes from './Table.module.scss';

const table = (props) => {
	let { headings, rows, footer } = props;

	if (props.isLoading) {
		headings = [];
		rows = [];
		footer = [];

		for(let i = 0; i < 5; i += 1) {
			headings.push(<span className={ classes.loading__span__shimmer }></span>);
			rows.push([
				<span className={ classes.loading__span__empty }></span>, 
				<span className={ classes.loading__span__empty }></span>, 
				<span className={ classes.loading__span__empty }></span>, 
				<span className={ classes.loading__span__empty }></span>, 
				<span className={ classes.loading__span__empty }></span>,
			]);
		}
	}

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
		<Fragment>
			<TransitionGroup component="tbody">
					{ rows.map((row, rowIndex) => {
						return (
							<CSSTransition
								key={ `row-${rowIndex}` }
								mountOnEnter
								in={ true }
								classNames={{
									appear: classes.rowAppear,
									appearActive: classes.rowAppearActive,
				          enter: classes.rowEnter,
				          enterActive: classes.rowEnterActive,
				          exit: classes.rowExit,
				          exitActive: classes.rowExitActive
				        }}					
				        timeout={ 350 }
								appear
								unmountOnExit>
								<tr id={ rowIndex } key={ `row-${rowIndex}` }>
									{ row.map((content, cellIndex) => <Cell 
										key={ `cell-${rowIndex}-${cellIndex}` }>{ content }</Cell>
									)}
								</tr>
							</CSSTransition>
						) 
					}) }
			</TransitionGroup>
		</Fragment>
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