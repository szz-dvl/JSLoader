module.exports = {
    entry: {
        background: "./bg/background_pre.js"
    },
	target: 'webworker',
    output: {
        //path: browser.extension.getURL("bg/"), //path.resolve(__dirname, "addon"),
        filename: "./bg/background.js"
    }
};
