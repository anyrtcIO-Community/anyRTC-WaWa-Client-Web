import io from 'socket.io-client';

(function (w) {
	var strFullSearch = w.location.search;
	var params = {};
	if (strFullSearch !== "") {
		var strSearch = strFullSearch.substr(1);
		var arrSearchItem = strSearch.split("&");

		for (var item in arrSearchItem) {
			var it = arrSearchItem[item];
			params[it.split('=')[0]] = it.split('=')[1];
		}
	}
	w.params = params;

	document.addEventListener("WeixinJSBridgeReady", function () {
		document.getElementById("ctrl").load();
		document.getElementById("ready").load();
		document.getElementById("suc").load();
		document.getElementById("failed").load();
	}, false);
})(window);

global.io = io;
global.DEV_ID = "";
global.APP_ID = '';
global.APP_KEY = '';
global.APP_TOKEN = '';