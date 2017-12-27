var WaWaClient = AnyRTCWaWaClient || window.AnyRTCWaWaClient;
var anyClient = new WaWaClient();

/**
 * 配置开发者信息
 * @anyrtc_developerid
 * @anyrtc_appid
 * @anyrtc_appkey
 * @anyrtc_apptoken
 * */
anyClient.initEngineWithAnyRTCInfo(DEV_ID, APP_ID, APP_KEY, APP_TOKEN);

anyClient.openServer();

anyClient.on("onConnectServerSuccess", function () {
	/**
	 * 获取房间列表
	 */
	anyClient.getRoomList();
	/**
	 * 获取房间列表回调
	 * @param strRoomList 房间列表Json
	 */
	anyClient.on("onGetRoomList", function (roomList) {
		var listHTML = "";

		for (var item in roomList) {
			var reg = new RegExp('{{\\s([\\w|\\S]*)\\s}}', 'ig');

			var listState = roomList[item]['room_state'];
			roomList[item]['link'] = listState === 0 ? './room.html?id='+roomList[item]['room_anyrtcid'] : 'javascript:void(0);';
			roomList[item]['class'] = listState === 0 ? 'going' : 'stoped';

			listHTML += document.querySelector("#listTemplate").innerHTML.replace(reg, function (text, key) {

				if (key == "room_state") {
					if (roomList[item][key] == "0") {
						return '游戏中'
					} else if (roomList[item][key] == "1") {
						return '维护中'
					}
				}

				return roomList[item][key]
			})
		}

		document.querySelector("#wawajiList").innerHTML = listHTML;
	})
});