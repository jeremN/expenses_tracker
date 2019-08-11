import React, { Fragment } from 'react';
import { withTranslation } from 'react-i18next';

import Indicator from './Indicator/Indicator';

const indicators = (props) => {
	const { t } = props;
	let indicatorsElements = props.kpis.map((kpi, index) => {
		return (			
			<Indicator 
				key={ `kpi-${index}` }
				title={ t(kpi.title) }
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

export default withTranslation()(indicators);