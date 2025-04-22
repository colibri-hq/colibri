export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25'),
	() => import('./nodes/26'),
	() => import('./nodes/27'),
	() => import('./nodes/28'),
	() => import('./nodes/29'),
	() => import('./nodes/30'),
	() => import('./nodes/31'),
	() => import('./nodes/32'),
	() => import('./nodes/33'),
	() => import('./nodes/34'),
	() => import('./nodes/35'),
	() => import('./nodes/36'),
	() => import('./nodes/37'),
	() => import('./nodes/38'),
	() => import('./nodes/39'),
	() => import('./nodes/40'),
	() => import('./nodes/41')
];

export const server_loads = [0,11,12,13,9];

export const dictionary = {
		"/(library)": [15,[2],[3]],
		"/api/docs": [36],
		"/(library)/authors": [~16,[2,4],[3]],
		"/(library)/authors/[author]": [~17,[2,4],[3]],
		"/auth/attestation": [37,[11]],
		"/auth/login": [~38,[11,12]],
		"/auth/login/unknown": [39,[11,12]],
		"/auth/oauth/authorize": [~40,[11,13],[,,14]],
		"/auth/oauth/device": [~41,[11,13]],
		"/(library)/books": [18,[2,5],[3]],
		"/(library)/books/add": [~22,[2,5],[3]],
		"/(library)/books/[book=id]": [~19,[2],[3]],
		"/(library)/books/[book=id]/cover": [20,[2,5],[3]],
		"/(library)/books/[book=id]/edit": [21,[2,5],[3]],
		"/(library)/collections": [23,[2,6],[3]],
		"/(library)/collections/[collection]": [24,[2,6],[3]],
		"/(library)/creators": [25,[2,7],[3]],
		"/(library)/creators/[creator=id]": [26,[2,7],[3]],
		"/(library)/discover": [27,[2,8],[3]],
		"/(library)/discover/featured": [30,[2],[3]],
		"/(library)/discover/[catalog=id]": [~28,[2,8],[3]],
		"/(library)/discover/[catalog=id]/[vanity]/[...segments=encoded_path]": [29,[2,8],[3]],
		"/(library)/help": [31,[2],[3]],
		"/(library)/instance/profile": [~32,[2,9],[3]],
		"/(library)/instance/settings": [33,[2,9],[3]],
		"/(library)/publishers": [34,[2,10],[3]],
		"/(library)/publishers/[publisher]": [~35,[2,10],[3]]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';