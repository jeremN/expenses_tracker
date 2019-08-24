import i18n from 'i18next';
import { initReactI18next  } from 'react-i18next';

import translationEN from './locales/en/translation';
import translationFR from './locales/fr/translation';

const resources = {
	en: {
		translation: translationEN
	},
	fr: {
		translation: translationFR
	}
}

const storedLang = () => {
	const hasLangStored = localStorage.getItem('expensesTracker__Lang');
	if (hasLangStored) return JSON.parse(hasLangStored).lang;
	return 'en';
}

i18n
	.use(initReactI18next )
	.init({
		resources,
		debug: false,
		fallbackLng: 'en',
		lng: storedLang(),
		keySeparator: false,
		interpolation: {
			escapeValue: false
		},
		react: {
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
      useSuspense: false,
    }	
 });

	export default i18n;