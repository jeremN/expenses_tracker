import React from 'react';

import Indicator from './Indicator/Indicator';

const indicators = (props) => {
	let indicatorsElements = props.kpis.map(kpi => {
		return (			
			<Indicator 
				title={ kpi.title }
			  value={ kpi.value }
			  currency="€"
			  progression={ kpi.progression }
			  progressClass={ kpi.progressClass } />
		)
	})

	return (
		<div className="col-3">
			{ indicatorsElements }
		</div>
	); 
}

export default indicators;