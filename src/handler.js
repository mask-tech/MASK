const fs = require('fs').promises;
const path = require('path');
const tools = require('./tools.js');

function handler (app, env, vapid) {
	function get (req, res) {
		function notFound (custom404, ctx) {
			res.status(404).render(path.join(__dirname, '../templates', custom404 || '404.njk'), ctx);
		}
		function tryFile (path, asset, ctx) {
			fs.access(path).then(err => {
				if (err) notFound(false, ctx);
				else res[asset ? 'sendFile' : 'render'](path, ctx);
			}).catch(() => {
				notFound(false, ctx);
			});
			
		}
		const args = req.url.split('/');
		args.shift();
		switch (args[0]) {
			case '': case 'home': {
				const posts = require('./posts.json').slice(0, 5);
				const vids = require('./posts.json').filter(post => {
					return post.type === 'video' && post.link.includes('www.youtube.com');
				}).slice(0, 5);
				const art = require('./posts.json').filter(post => post.type === 'art').slice(0, 5);
				res.render(path.join(__dirname, '../templates', 'home.njk'), { posts, vids, art });
				break;
			}
			case 'art': {
				const posts = require('./posts.json').filter(post => post.type === 'art');
				res.render(path.join(__dirname, '../templates', 'art.njk'));
				break;
			}
			case 'assets': {
				args.shift();
				const filepath = path.join(__dirname, '../assets', ...args);
				fs.access(filepath).then(err => {
					if (err) notFound();
					else res.sendFile(filepath);
				}).catch(() => notFound());
				break;
			}
			case 'members': {
				const members = require('./members.json');
				const ctx = {
					'Governors': [],
					'5th': [],
					'4th': [],
					'3rd': [],
					'2nd': [],
					'1st': [],
					'Former Governors': [],
					'Alumni': []
				};
				members.forEach(member => {
					ctx[member.gov || ['0th', '1st', '2nd', '3rd', '4th', '5th'][member.year]].push({
						name: member.name,
						roll: member.roll,
						href: `${member.name.toLowerCase().replace(/[\.-]/g, '').replace(/ /g, '_')}.webp`,
						teams: [{
							name: 'AMV',
							icon: 'fas fa-film'
						}, {
							name: 'Design & Arts',
							icon: 'fas fa-paint-brush'
						}, {
							name: 'Music',
							icon: 'fas fa-music'
						}, {
							name: 'Quiz',
							icon: 'fas fa-feather-alt'
						}, {
							name: 'WebDev',
							icon: 'fas fa-laptop-code'
						}].filter((_, index) => member.teams[index])
					});
				});
				tryFile(path.join(__dirname, '../templates', 'members.njk'), false, { members: ctx });
				break;
			}
			case 'newsletters': {
				const months = [
					'-', 'January', 'February', 'March', 'April', 'May', 'June',
					'July', 'August', 'September', 'October', 'November', 'December'
				];
				fs.readdir(path.join(__dirname, '../templates/newsletters')).then(letters => {
					const years = {};
					letters.sort(); // Windows isn't automatically sorted
					letters.forEach(letter => {
						const [year, month, num] = letter.slice(0, -4).split('-');
						if (!years[year]) years[year] = { title: year, months: {} };
						if (!years[year].months[month]) years[year].months[month] = { title: months[~~month], issues: [] };
						years[year].months[month].issues.push({
							title: ['-', 'First', 'Second', 'Special'][~~num],
							href: letter.slice(0, -4)
						});
					});
					const renderYears = Object.values(years);
					renderYears.forEach(year => year.months = Object.values(year.months));
					if (!args[1]) return res.render(path.join(__dirname, '../templates', 'newsletters.njk'), {
						years: renderYears.reverse()
					});
					if (args[1] === 'random') {
						const referer = req.headers.referer?.split('/').pop();
						const randLetter = letters.filter(letter => letter.slice(0, -4) !== referer).random().slice(0, -4);
						return res.redirect(`/newsletters/${randLetter}`);
					}
					const index = letters.indexOf(args[1] + '.njk');
					if (index === -1) return notFound('newsletters_404.njk', { years: renderYears.reverse() });
					const filepath = path.join(__dirname, '../templates', 'newsletters', letters[index]);
					const adjs = [letters[index - 1]?.slice(0, -4), letters[index + 1]?.slice(0, -4), letters[index].slice(0, -4)];
					return res.render(filepath, { adjs });
				}).catch(err => console.log(err) || notFound());
				break;
			}
			case 'rebuild': {
				env.loaders.forEach(loader => loader.cache = {});
				['./members.json', './posts.json'].forEach(cache => delete require.cache[require.resolve(cache)]);
				res.render(path.join(__dirname, '../templates', 'rebuild.njk'));
				break;
			}
			case 'videos': {
				const vids = require('./posts.json');
				const youtubeVids = vids.filter(vid => vid.link.includes('www.youtube.com'));
				const instaVids = vids.filter(vid => vid.link.includes('www.instagram.com'));
				res.render(path.join(__dirname, '../templates', 'videos.njk'), { youtubeVids, instaVids });
				break;
			}
			default: {
				while (!args[args.length - 1]) args.pop();
				const isAsset = /\.(?:js|ico)$/.test(args[args.length - 1]);
				const filepath = path.join(
					__dirname,
					isAsset ? '../assets' : '../templates', path.join(...args) + (isAsset ? '' : '.njk')
				);
				tryFile(filepath, isAsset);
				
			}
		}
	}
	function post (req, res) {
		// no POST routes currently in use
		// redirect to GET
		return res.redirect(req.url);
	}

	app.get(/.*/, (req, res) => get(req, res));
	app.post(/.*/, (req, res) => post(req, res));

	// VAPID will be required for push notifications
}

module.exports = handler;