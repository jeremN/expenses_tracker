import React, { Fragment } from 'react';

import Indicator from './Indicator/Indicator';

const indicators = (props) => {
	let indicatorsElements = props.kpis.map((kpi, index) => {
		return (			
			<Indicator 
				key={ `kpi-${index}` }
				title={ kpi.title }
			  value={ kpi.value }
			  currency="€"
			  progression={ kpi.progression }
			  progressClass={ kpi.progressClass } />
		)
	})

	return (
		<Fragment>
			{ indicatorsElements }
		</Fragment>
	); 
}

export default indicators;