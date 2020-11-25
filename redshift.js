const { exec } = require("child_process");

var test = "-PO 2000";

function set(args) {
	exec("redshift " + args, (error, stdout, stderr) => {
		if (error) {
			return error.message;
		} if (stderr) {
			return stderr;
		} return stdout;
})};

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
console.log(set(test))
sleep(1000);

module.exports.set = set;
