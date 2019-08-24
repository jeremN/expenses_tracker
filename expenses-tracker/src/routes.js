import Auth from './containers/Auth/Auth';
import ResetPassword from './containers/ResetPassword/ResetPassword';
import Logout from './containers/Auth/Logout/Logout';
import Home from './containers/Home/Home';
import Stats from './containers/Statistics/Statistics';
import Profile from './containers/Profil/Profil';
import NotFound from './components/NotFound/NotFound';

const routes = [
	{
		path: '/',
		component: Home,
		display: 'always',
		exact: true,
	}, {
		path: '/auth',
		component: Auth,
		display: 'always',
		exact: true,
	}, {
		path: '/logout',
		component: Logout,
		display: 'isAuth',
	}, {
		path: '/stats',
		component: Stats,
		display: 'isAuth',
		exact: true,
	}, {
		path: '/profil',
		component: Profile,
		display: 'isAuth',
		exact: true,
	}, {
		path: '/forgotpassword',
		component: ResetPassword,
		display: 'always',
		exact: true,
	}, {
		path: '',
		component: NotFound,
		display: 'isAuth',
	},
];

export default routes;