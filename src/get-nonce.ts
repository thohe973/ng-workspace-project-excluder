export function getNonce() {
	let res = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		res += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return res;
}
