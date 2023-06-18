const router = require('express').Router();

router.get('/login', (req, res) => {
	if (req.loggedIn) return res.redirect('/');
	res.renderFile('login.njk');
});

router.get('/logout', (req, res) => {
	if (!req.loggedIn) return res.redirect('/login');
	return req.logout(() => res.redirect('/'));
});

module.exports = {
	route: '/',
	router
};
