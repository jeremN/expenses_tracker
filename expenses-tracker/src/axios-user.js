import axios from 'axios';

const instance = axios.create({
	baseURL: 'https://expensestracker-30d51.firebaseio.com/'
});

export default instance;