document.addEventListener("WeixinJSBridgeReady", function () {
	document.getElementById("ctrl").load();
	document.getElementById("ready").load();
	document.getElementById("suc").load();
	document.getElementById("failed").load();
}, false);

var ROOM_ID,
	PLAYER,
	URL,
	READY_TIMER,
	READY_SECONDS = 10,
	PLAY_TIMER,
	PLAY_SECONDS = 30,
	STATE = 0,      // 0未排队 1队列中
	CANVAS = document.getElementById("wawa_video");

//
var arrParams = params || window.params;

if (Object.keys(arrParams).length !== 0) {
	ROOM_ID = arrParams.id;
	document.querySelector("#waajiID").innerHTML = ROOM_ID;
	document.title = "anyRTC娃娃机-房间号"+ ROOM_ID;

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

	/**
	 *  开启服务并连接远程娃娃机
	 **/
	anyClient.openServer();

	/**
	 * 连接娃娃机成功
	 * */
	anyClient.on("onConnectServerSuccess", function () {
		/*********************************/
		// 预约
		document.querySelector("#appointment").onclick = function () {
			STATE = 1;

			anyClient.book();
			// 隐藏预约、显现取消预约按钮
			document.querySelector("#bookBtn").style.display = 'none';
			document.querySelector("#unBookBtn").style.display = 'inline-block';
		};
		// 取消预约
		document.querySelector("#cancelAppointment").onclick = function () {
			STATE = 0;

			anyClient.unbook();
			document.querySelector("#bookBtn").style.display = 'inline-block';
			document.querySelector("#unBookBtn").style.display = 'none';
		};
		// 开始游戏
		document.querySelector("#startBtn").onclick = function () {
			// 隐藏开始游戏蒙层
			document.querySelector("#mask").style.display = "none";

			// 隐藏预约、显示控制
			document.querySelector('#apply').style.display = 'none';
			document.querySelector('#controller').style.display = 'block';
			// 显示切换视角按钮
			document.querySelector('#transformCamera').style.display = 'block';

			//
			playReadyAudio();

			// 开始游戏 GO
			anyClient.play();

			// 游戏倒计时
			PLAY_TIMER = setInterval(function () {
				if (PLAY_SECONDS === 0) {
					clearInterval(PLAY_TIMER);
					PLAY_SECONDS = 30;
					PLAY_TIMER = null;
					document.querySelector('#leftActionSeconds').innerHTML = "";
					return
				}
				PLAY_SECONDS--;
				document.querySelector('#leftActionSeconds').innerHTML = (PLAY_SECONDS === 1) ?  "" : "（"+ PLAY_SECONDS +"s）";
			}, 1000);
		};
		// 向上
		document.querySelector("#moveTop").onclick = function () {
			if (anyClient.canGet) {
				playCtrlAudio();
			}

			anyClient.sendControlCmd(0);
		};
		// 向右
		document.querySelector("#moveRight").onclick = function () {
			if (anyClient.canGet) {
				playCtrlAudio();
			}

			anyClient.sendControlCmd(3);
		};
		// 向左
		document.querySelector("#moveLeft").onclick = function () {
			if (anyClient.canGet) {
				playCtrlAudio();
			}

			anyClient.sendControlCmd(2);
		};
		// 向下
		document.querySelector("#moveBottom").onclick = function () {
			if (anyClient.canGet) {
				playCtrlAudio();
			}

			anyClient.sendControlCmd(1);
		};
		// 抓取
		document.querySelector("#getIt").onclick = function () {
			if (anyClient.canGet) {
				playCtrlAudio();
			}

			anyClient.sendControlCmd(4);

			// 清除定时器
			if (PLAY_TIMER) {
				clearInterval(PLAY_TIMER);
				PLAY_SECONDS = 30;
				PLAY_TIMER = null;
				document.querySelector('#leftActionSeconds').innerHTML = "";
			}
		};
		// 旋转摄像头
		document.querySelector("#transformCamera").onclick = function () {
			if (anyClient.canGet) {
				playCtrlAudio();
			}

			anyClient.sendControlCmd(5);
		};
		// 取消游戏
		document.querySelector("#cancelBtn").onclick = function () {
			// 隐藏蒙层
			document.querySelector("#mask").style.display = "none";

			// 清除准备定时器
			if (READY_TIMER) {
				clearInterval(READY_TIMER);
				READY_SECONDS = 10;
				READY_TIMER = null;
				document.querySelector('#leftGoSeconds').innerHTML = "";
			}
			//
			anyClient.canclePlay();
		};
		// 返回列表
		document.querySelector("#backBtn").onclick = function () {
			window.location.href = "./";
		};
		// 在玩一次
		document.querySelector("#againBtn").onclick = function playAgain () {
			// 隐藏蒙层
			document.querySelector("#mask").style.display = "none";

			// 重置结果页面按钮
			document.querySelector("#cancelBtn").style.display = 'inline-block';
			document.querySelector("#startBtn").style.display = 'inline-block';
			document.querySelector("#backBtn").style.display = 'none';
			document.querySelector("#againBtn").style.display = 'none';
			// 显示预约、隐藏控制
			document.querySelector('#apply').style.display = 'block';
			document.querySelector('#controller').style.display = 'none';
		}
	});

	//初始化anyrtc成功
	anyClient.on("onInitAnyRTCSuccess", function () {
		/**
		 * 进入房间
		 * @strAnyRTCId
		 * @strUserId
		 * @strUserName
		 * @strUserIcon
		 * */
		anyClient.joinRoom(ROOM_ID, 'web_' + randomNumber(), '玩家'+ randomNumber(6), '');
	});

	//初始化anyRtc失败
	anyClient.on("onInitAnyRTCFaild", function (data) {
		console.log(data);
	});

	/**
	 * 加入房间
	 * @param nCode 状态码
	 * @param videoInfo 视频流信息
	 * @param strMemberNum 房间内人数
	 */
	anyClient.on("onJoinRoom", function (nCode, videoInfo, strMemberNum) {
		//console.log(nCode, videoInfo, strMemberNum);
		if (nCode === 0) {
			try {
				// 在线人数
				document.querySelector("#onlineMember").innerHTML = strMemberNum;

				if (videoInfo !== "" && typeof videoInfo === "string") {
					var URL = JSON.parse(videoInfo) || '';

					if (URL !== "") {
						// 选择方案RTCP 还是 WS
						function hasGetUserMedia() {
							// Note: Opera builds are unprefixed.
							return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
								navigator.mozGetUserMedia || navigator.msGetUserMedia);
						}

						var ua = navigator.userAgent.toLocaleLowerCase();

						if (
							(ua.indexOf('android')!==-1 && ua.indexOf('mobile')!==-1 && ua.indexOf('linux')!==-1) ||
							ua.indexOf('micromessenger')!==-1 ||
							!hasGetUserMedia()
						) {
							// alert('微信 '+ URL.H5LiveUrl);
							PLAYER = new JSMpeg.Player(URL.H5LiveUrl, {
								canvas: CANVAS
							});
						} else {
							if (ua.indexOf('chrome')!== -1) {
								// alert('chrome '+ URL.RtcpUrl);
								document.getElementById("wawa_video").style.display = "none";

								var RtcSub = RtcpKit || window.RtcpKit;
								var rtcSub = new RtcSub();

								// rtcSub.configServerForPriCloud("teameeting.anyrtc.io", 9091);
								rtcSub.initEngineWithAnyRTCInfo(DEV_ID, APP_ID, APP_KEY, APP_TOKEN);
								//创建界面视频
								rtcSub.on('onRTCOpenVideoRender', function (strRtcpId) {
									var video = document.createElement('video');
									video.id = strRtcpId;
									video.autoplay = "autoplay";
									video.style.width = "100%";
									video.style.height = "auto";

									document.getElementById("video_view").appendChild(video);
								});
								//设置远程流
								rtcSub.on('onRemoteStream', function (stream, strRtcpId) {
									rtcSub.setRTCVideoRender(stream, document.getElementById(strRtcpId));
								});

								//订阅
								rtcSub.subscribe(URL.RtcpUrl);

								rtcSub.on("onSubscribeOK", function (strRtcpId) { });

								rtcSub.on("onSubscribeFailed", function (nCode) { });
							} else {
								// alert('!chrome '+ URL.H5LiveUrl);
								PLAYER = new JSMpeg.Player(URL.H5LiveUrl, {
									canvas: CANVAS
								});
							}
						}
					} else {
						alert('服务错误！ERR::MSG没有找到视频流');
					}
				}
			} catch (e) {
				console.log(e);
			}
		}
	});

	/**
	 * 获取房间列表
	 * @param strRoomList 房间列表Json
	 */
	// anyClient.on("onGetRoomList", function (roomList) {
	// 	console.log(roomList);
	// });

	/**
	 * 预约结果
	 * @param nCode 状态码
	 * @param strBookNum 预约人数
	 */
	anyClient.on("onBookResult", function (nCode, strBookNum) {
		if (nCode === 0) {
			document.querySelector("#bookBtn").style.display = 'none';
			document.querySelector("#unBookBtn").style.display = 'inline-block';

			if (strBookNum === 0 && strBookNum === undefined) {
				document.querySelector("#appointmentTip").innerHTML = '';
			} else {
				document.querySelector("#appointmentTip").innerHTML = '当前排队人数： ' + strBookNum;
			}
		}
	});

	/**
	 * 取消预约结果
	 * @param nCode 状态码
	 * @param strBookNum 预约人数
	 */
	anyClient.on("onUnBookResult",function (nCode, strBookNum) {
		if (nCode === 0) {
			document.querySelector("#bookBtn").style.display = 'inline-block';
			document.querySelector("#unBookBtn").style.display = 'none';

			if (strBookNum === 0 && strBookNum === undefined) {
				document.querySelector("#appointmentTip").innerHTML = '';
			} else {
				document.querySelector("#appointmentTip").innerHTML = '当前排队人数： ' + strBookNum;
			}
		}
	});

	/**
	 * 预约人数更新
	 * @param strBookMemberNum 预约人数
	 */
	anyClient.on("onRoomMemberUpdate", function (strBookMemberNum) {
		document.querySelector("#appointmentTip").innerHTML = '当前排队人数： ' + strBookMemberNum;
	});

	/**
	 * 指令回掉
	 * @param nCode 状态码
	 * @param strCmd 指令 left up ...
	 */
	anyClient.on("onControlCmd", function (nCode, strCmd) {
		console.log("CMD:: "+ strCmd);
	});

	/**
	 * 准备开始通知
	 */
	anyClient.on('onReadyStart', function () {
		// 显现预约、隐藏取消预约按钮
		document.querySelector("#bookBtn").style.display = 'inline-block';
		document.querySelector("#unBookBtn").style.display = 'none';

		// 倒计时
		READY_TIMER = setInterval(function () {
			if (READY_SECONDS === 0) {
				clearInterval(READY_TIMER);
				READY_SECONDS = 10;
				READY_TIMER = null;
				document.querySelector('#leftGoSeconds').innerHTML = "";
				return
			}
			READY_SECONDS--;
			document.querySelector('#leftGoSeconds').innerHTML = (READY_SECONDS === 1) ?  "" : "（"+ READY_SECONDS +"s）";
		}, 1000);

		// 打开开始游戏页面
		changeState('go');
	});

	/**
	 * 抓娃娃结果
	 * @param result true get false not get
	 */
	anyClient.on('onResult', function (bResult) {
		// 隐藏切换视角按钮
		document.querySelector('#transformCamera').style.display = 'none';

		if (bResult) {//抓取成功
			changeState('win');
			playSucAudio();
		} else {//抓取失败
			changeState('lose');
			playFailedAudio();
		}
		// 清除定时器
		if (READY_TIMER) {
			clearInterval(READY_TIMER);
			READY_SECONDS = 10;
			READY_TIMER = null;
			document.querySelector('#leftGoSeconds').innerHTML = "";
		}
	});


	/**
	 * 排队人数更新
	 * @param strBookMemberNum 房间人数
	 */
	anyClient.on("onBookMemberUpdate", function (strBookMember) {
		document.querySelector("#appointmentTip").innerHTML = strBookMember;
	});

	/**
	 * 房间人数更新
	 * @param strMemberNum 房间人数
	 */
	anyClient.on("onRoomMemberUpdate", function (strRoomMember) {
		document.querySelector("#onlineMember").innerHTML = strRoomMember;
	});

	/**
	 * 抓娃娃超时
	 * @param nCode 状态码
	 * @param jData 返回错误
	 */
	anyClient.on("onPlayTimeout", function () {
		alert('服务器故障');
		window.location.href = "./";
	});

	/**
	 * 准备超时通知
	 */
	anyClient.on("onReadyTimeout", function () {
		// 清除定时器
		if (READY_TIMER) {
			clearInterval(READY_TIMER);
			READY_SECONDS = 10;
			READY_TIMER = null;
		}
		// 隐藏开始游戏蒙层
		document.querySelector("#mask").style.display = "none";

		// 隐藏取消预约、限制立即预约
		document.querySelector("#bookBtn").style.display = 'inline-block';
		document.querySelector("#unBookBtn").style.display = 'none';
	});

	/**
	 * 娃娃机视频流变化
	 * @param nCode 状态码
	 * @param jData 返回错误
	 */
	anyClient.on("onRoomUrlUpdate", function (nCode, jData) {
		// 待定
	});

	/**
	 * 娃娃机离开房间
	 * @param nCode 状态码
	 */
	anyClient.on("onWaWaLeave", function () {
		alert("娃娃机退出！");
		window.location.href = "./";
	});

	/**
	 * 与服务断开连接
	 */
	anyClient.on('onDisconnect', function () {
		console.log('和服务器断开连接，正在尝试重连');
	});

	/**
	 * 重连服务
	 */
	anyClient.on('onReconnect', function () {
		console.log('正在重连中...');
	});

	/****************************/
	function randomNumber (len) {
		var strNumber = '0123456789';
		var strId = '';

		if (typeof len === 'undefined') {
			len = 8;
		}

		for (var i=0; i<len; i++) {
			strId += strNumber.split('')[parseInt(Math.random()*strNumber.length)];
		}

		return strId
	}

	// 更改游戏状态
	function changeState (state) {
		if (state === undefined || state === null || state === "") {
			return
		}

		// 打开蒙层
		document.querySelector("#mask").style.display = "block";
		// 显示结果图片
		var reg = new RegExp('{{\\s([\\w|\\S]*)\\s}}', 'ig');
		var resHTML = document.querySelector("#imgResTemp").innerHTML.replace(reg, function (text, key) {
			return {state: state}[key]
		});
		document.querySelector('#resImg').innerHTML = resHTML;

		// 打开不同的按钮
		if (state === 'go') {
			document.querySelector("#startBtn").innerHTML = "开始游戏";
		} else if (state === 'win' || state === 'lose') {
			// 隐藏取消和开始游戏按钮
			document.querySelector("#cancelBtn").style.display = 'none';
			document.querySelector("#startBtn").style.display = 'none';
			// 显示返回列表和在玩一次按钮
			document.querySelector("#backBtn").style.display = 'inline-block';
			document.querySelector("#againBtn").style.display = 'inline-block';

			// 返回列表字体更改
			if (state === "win") {
				document.querySelector("#startBtn").innerHTML = "再接再厉";
				document.querySelector("#backBtn").innerHTML = "休息一下";
				document.querySelector("#backBtn").className = "relax"
			} else {
				document.querySelector("#startBtn").innerHTML = "再来一局";
				document.querySelector("#backBtn").innerHTML = "无力再战";
				document.querySelector("#backBtn").className = "cancel"
			}
		}
	}
	//
	function playCtrlAudio () {
		document.querySelector("#ctrl").pause();
		document.querySelector("#ctrl").play();
	}
	function playReadyAudio () {
		document.querySelector("#ctrl").pause();
		document.querySelector("#ready").play();
	}
	function playSucAudio () {
		document.querySelector("#ctrl").pause();
		document.querySelector("#suc").play();
	}
	function playFailedAudio () {
		document.querySelector("#ctrl").pause();
		document.querySelector("#failed").play();
	}
}

