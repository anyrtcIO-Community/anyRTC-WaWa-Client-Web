/*! rtcp_kit.js build:0.0.1, development. Copyright(c) 2017 BoYuan@SH */
(function (exports) {
	var gThis = null;
	//注销
	window.onbeforeunload = function () {
		if (gThis != null) {
			gThis.close();
			gThis = null;
		}
	};


	/**********************************************************/
	/*                                                        */
	/*                       事件处理器                        */
	/*                                                        */
	/**********************************************************/
	function EventEmitter () {
		this.events = {};
	}

	//���¼�����
	EventEmitter.prototype.on = function (eventName, callback) {
		this.events[eventName] = this.events[eventName] || [];
		this.events[eventName].push(callback);
	};
	//�����¼�����
	EventEmitter.prototype.emit = function (eventName, _) {
		var events = this.events[eventName],
			args = Array.prototype.slice.call(arguments, 1),
			i, m;

		if (!events) {
			return;
		}
		for (i = 0, m = events.length; i < m; i++) {
			events[i].apply(null, args);
		}
	};

	/**********************************************************/
	/*                                                        */
	/*                   信道建立部分                          */
	/*                                                        */
	/**********************************************************/

	/*******************基础部分*********************/
	function RtcpKit () {
		gThis = this;
		if (!(this instanceof RtcpKit)) return new RtcpKit();
		//远程地址
		var ishttps = 'https:' == document.location.protocol ? true : false;
		if (ishttps) {
			this.url = "https://www.teameeting.cn";
			//this.url = "https://cloud.anyrtc.io";
		}
		else {
			// this.url = "http://teameeting.anyrtc.io:9091";	//"http://192.168.199.219:9091";//
			this.url = "http://cloud.anyrtc.io:9091"
		}

		//
		var that = this;
		//
		this.isAudioLive = false;  // false 音视频直播  true  音频直播
		this.localStream;
		// 系统帐号配置
		this.anyrtcId;
		this.devId = "16864513";
		this.appId = "com.dync.anyrtc";
		this.appKey = "rF55qBISN/g8RoWGw3ZwIFdRAWnAbUq9lfMIjBvnDs4";
		this.appToken = "3a7010165a22964673e631e162ae2877";
		// 自己的ID，由后服务器创建
		this.myDyncId = "";
		this.myNetStatus = 0;	//0:init 1:connecting 2:OK
		this.msgSeqn = 0;
		this.anyRTC = new AnyRTC();

		//
		this.cachePub = false;      // 是否推流的标识
		this.pubChanId = "";        //  正在推流的id
		this.cacheSubs = {};
		this.subsId = {};           // 需要拉流的存储对象
		//
		var request = null;
		var hangingGet = null;
		// this.getAnyRtcInfo();

		this.version = "v2.2.2";

		/*************************Callback部分***************************/
		this.anyRTC.on('stream_created', function (stream, dVideoRender) {
			that.localStream = stream;
			that.emit("onSetLocalVideoCapturerResult", 0, dVideoRender);
		});
		this.anyRTC.on('stream_create_error', function (nErrorCode) {
			that.emit("onSetLocalVideoCapturerResult", nErrorCode);
		});
		this.anyRTC.on('onRemoteStream', function (stream, pubId) {
			that.emit('onRemoteStream', stream, pubId);
		});
		this.anyRTC.on('onSendToPeer', function (chanId, jstr) {
			that.sendToPeer(chanId, jstr);
		});
		this.anyRTC.on("onMemberJoin", function (pubId) {
			var dRander = document.createElement('video');
			dRander.style.width = '100%';
			dRander.style.height = 'auto';
			dRander.autoplay = 'autoplay';

			that.emit('onRTCOpenVideoRender', pubId);
		});
		this.anyRTC.on("onMemberLeave", function (pubId) {
			that.emit('onRTCCloseVideoRender', pubId);
		});

		/*************************内部Function部分***************************/
		this.doJoin = function () {
			that.myNetStatus = 1;
			try {
				that.request = new XMLHttpRequest();
				var request = that.request;
				request.onreadystatechange = function () {
					try {
						if (request.readyState == 4) {
							if (request.status == 200) {
								//console.log(request.responseText);

								var jsResp = JSON.parse(request.responseText);
								if (jsResp.Code == 200) {
									that.myNetStatus = 2;

									if (that.myDyncId == "") {
										that.myDyncId = jsResp.DyncID;
										that.startHangingGet();
									}
									request = null;

									// 判断是否推流
									if (that.cachePub == true) {
										that.doPublish();
									}

									// 判断是否订阅
									// 遍历订阅的对象
									for (var sub in that.subsId) {
										if (that.subsId[sub] === true) {
											that.doSubscribe(sub);
											// 防止多次订阅
											that.subsId[sub] = false;
										}
									}
								}
								else {
									that.myNetStatus = 0;
									that.emit('onJoinFailed', "连接RTC失败： " + request.status);
								}
							} else {
								// ？？？
								that.emit('onJoinFailed', "连接RTC失败： " + request.status);
							}
						}
					} catch (e) {
						console.log("Error: " + e.description + " e: " + e);
						that.emit('onJoinFailed', "连接RTC失败：  " + e);
					}
				};
				request.open("GET", that.url + "/anyapi/v1/connect?DeveloperID=" + that.devId + "&AppID=" + that.appId + "&AnyrtcID=" + that.anyrtcId
					+ "&Key=" + that.appKey + "&Token=" + that.appToken + "&Type=rtcp", false);
				request.send();
			} catch (e) {
				console.log("2 error: " + e.description + " e: " + e);
			}
		};

		this.doPublish = function () {
			if (that.myDyncId != "") {
				that.request = new XMLHttpRequest();
				var request = that.request;
				request.onreadystatechange = function () {
					try {
						if (request.readyState == 4) {
							if (request.status == 200) {
								//console.log(request.responseText);
								var jsResp = JSON.parse(request.responseText);
								if (jsResp.Code == 0) {
									request = null;
								}
								else {
									console.log("doPublish Error code: " + jsResp.Code);
								}

							} else {
								console.log("doPublish Error: " + request.status);
							}
						}
					} catch (e) {
						console.log("doPublish Error: " + e.description + " e: " + e);
					}
				}

				var liveType = that.isAudioLive ? "1" : "0";

				request.open("GET", that.url + "/anyapi/v1/dopublish?DyncID=" + that.myDyncId + "&Type="+ liveType + "&AnyrtcID=" + that.anyrtcId, false);
				request.send();
			}
		};

		this.doUnPublish = function (chanId) {
			if (that.myDyncId != "") {
				XMLHttp.sendReq("GET", that.url + "/anyapi/v1/dounpublish?DyncID=" + that.myDyncId + "&ChanID=" + chanId, null, function (obj) {
				});
			}

			that.anyRTC.destroyPublisher(chanId);
		};

		this.doSubscribe = function (pubId) {
			if (that.myDyncId != "") {
				that.request = new XMLHttpRequest();
				var request = that.request;

				request.onreadystatechange = function () {
					try {
						if (request.readyState == 4) {
							if (request.status == 200) {
								console.log(request.responseText);

								var jsResp = JSON.parse(request.responseText);
								if (jsResp.Code == 0) {
									request = null;
								}
								else {
									console.log("doSubscribe Error code: " + jsResp.Code);
								}

							} else {
								console.log("doSubscribe Error: " + request.status);
							}
						}
					} catch (e) {
						console.log("doSubscribe Error: " + e.description + " e: " + e);
					}
				}
				request.open("GET", that.url + "/anyapi/v1/dosubscribe?DyncID=" + that.myDyncId + "&PubID=" + pubId + "&AnyrtcID=" + that.anyrtcId, false);
				request.send();
			}
		};

		this.doUnSubscribe = function (pubId) {
			var chanId = that.anyRTC.destroySubscriber(pubId);
			if (that.myDyncId != "" && chanId != null) {
				XMLHttp.sendReq("GET", that.url + "/anyapi/v1/dounsubscribe?DyncID=" + that.myDyncId + "&ChanID=" + chanId, null, function (obj) {
				});
			}
		};

		this.sendToPeer = function (chanId, data) {
			XMLHttp.sendReq("POST", that.url + "/anyapi/v1/sdpinfo?DyncID=" + that.myDyncId + "&ChanID=" + chanId, data, function (obj) {

			});
		};

		this.doCheckNetStatus = function () {
			var netCt = 0;
			if (that.cachePub == true) {
				netCt++;
			}

			for (sub in that.subsId) {
				netCt++;
			}

			if (netCt == 0) {
				that.close();
			}
		};

		this.startHangingGet = function () {
			if (that.hangingGet != null || that.hangingGet != undefined)
				return;
			try {
				that.hangingGet = new XMLHttpRequest();
				var hangingGet = that.hangingGet;
				hangingGet.timeout = 60000;
				hangingGet.onreadystatechange = function () {
					try {
						if (hangingGet.readyState != 4)
							return;
						if (hangingGet.status != 200) {
							if (hangingGet.status == 0) {// Timeout
								if (that.hangingGet) {
									that.hangingGet.abort();
									that.hangingGet = null;
								}
								if (that.myDyncId != "") {
									window.setTimeout(that.startHangingGet(), 10);
								}
							} else {
								that.hangingGet = null;
								console.log("server error: " + hangingGet.status);
								//* that.emit('onDisconnect', "Net error");
							}
						} else {
							var jsResp = JSON.parse(hangingGet.responseText);
							if (jsResp.Msgs != undefined) {
								var jsMsgs = jsResp.Msgs;
								for (var i = 0; i < jsMsgs.length; i++) {
									console.log(jsMsgs[i]);
									var jMsg = JSON.parse(jsMsgs[i]);
									if (jMsg.Seqn <= that.msgSeqn) {
										continue;
									}
									that.msgSeqn = jMsg.Seqn;
									/**
									 DC_MESSAGE = 1001,
									 DC_PUBLISH,
									 DC_UNPUBLISH,
									 DC_SUBSCRIBE,
									 DC_UNSUBSCRIBE,
									 DC_SDP_INFO,
									 */
									if (jMsg.Cmd == 1001) {

									}
									else if (jMsg.Cmd == 1002) {//DC_PUBLISH
										if (jMsg.Params.Result == "ok") {
											that.pubChanId = jMsg.Params.ChanId;
											that.anyRTC.createPublisher(jMsg.Params.ChanId);

											/**
											 *  发布媒体成功回调
											 *
											 * */
											that.emit("onPublishOK", jMsg.Params.DyncerId);
										}
										else {
											/**
											 *  发布媒体失败回调
											 *  nCode   状态码
											 * */
											that.emit("onPublishFailed");
										}
									}
									else if (jMsg.Cmd == 1003) {//DC_UNPUBLISH

									}
									else if (jMsg.Cmd == 1004) {//DC_SUBSCRIBE
										if (jMsg.Params.Result == "ok") {
											var jsBody = JSON.parse(jMsg.Body);
											that.anyRTC.createSubscriber(jMsg.Params.ChanId, jMsg.Params.PubId, jsBody);
											/**
											 *  订阅频道成功回调
											 *
											 * */
											that.emit("onSubscribeOK", jMsg.Params.PubId);
										}
										else {
											/**
											 *  订阅频道失败回调
											 *  strRtcpId   发布成功时的通道Id;
											 *  nCode       状态码
											 * */
											that.emit("onSubscribeFailed", jMsg.Params.PubId, 211);
										}
									}
									else if (jMsg.Cmd == 1005) {//DC_UNSUBSCRIBE

									}
									else if (jMsg.Cmd == 1006) {//DC_SDP_INFO
										var chanId = jMsg.Params.ChanId;
										that.anyRTC.getSdpInfo(chanId, jMsg.Body);
									}
								}
							}

							if (that.hangingGet) {
								that.hangingGet.abort();
								that.hangingGet = null;
							}
							if (that.myDyncId != "")
								window.setTimeout(that.startHangingGet(), 10);
						}
					} catch (e) {
						console.log("Hanging get error: " + e.description + " e: " + e);
					}
				};
				console.log("Http " + that.url + "/anyapi/v1/polling?DyncID=" + that.myDyncId + "&Seqn=" + that.msgSeqn);
				hangingGet.open("GET", that.url + "/anyapi/v1/polling?DyncID=" + that.myDyncId + "&Seqn=" + that.msgSeqn, true);
				hangingGet.send();
			} catch (e) {
				console.log("Hanging error " + e.description + " e: " + e);
			}
		};
	}

	//继承自事件处理器，提供绑定事件和触发事件的功能
	RtcpKit.prototype = new EventEmitter();

	RtcpKit.prototype.genAnyRtcId = function () {
		return Math.random().toString(36).substr(2);
	};

	RtcpKit.prototype.getAnyRtcInfo = function () {
		var that = this;
		var url = document.URL;
		if (url.lastIndexOf("#") > 0) {
			that.anyrtcId = url.substring(url.lastIndexOf("#") + 1, url.length);
		}
		else {
			that.anyrtcId = that.genAnyRtcId();
		}
	};

	// SDK初始化
	RtcpKit.prototype.initEngineWithAnyRTCInfo = function (devId, appId, appKey, appToken) {
		var that = this;
		that.devId = devId;
		that.appId = appId;
		that.appKey = appKey;
		that.appToken = appToken;
	};

	/**
	 *  配置私有云
	 *  @params strAddress      私有云服务地址
	 *  @params nPort           私有云服务端口
	 *  API说明                   配置私有云信息。当使用私有云时才需要调用该接口配置，默认不需要配置。
	 **/
	RtcpKit.prototype.configServerForPriCloud = function (strAddress, nPort) {
		var that = this;

		var ishttps = 'https:' == document.location.protocol ? true : false;
		if (ishttps) {
			if (nPort) {
				that.url = "https://" + strAddress + ":" + nPort;
			} else {
				that.url = "https://" + strAddress;
			}
		} else {
			if (nPort) {
				that.url = "http://" + strAddress + ":" + nPort;
			} else {
				that.url = "http://" + strAddress;
			}
		}
	};

	/**
	 *  获取SDK版本
	 *  RETURN  String  SDK版本号
	 **/
	RtcpKit.prototype.getSdkVersion = function () {
		return this.version;
	};

	/*************************Function部分***************************/
	// 设置本地音频是否打开
	RtcpKit.prototype.setLocalAudioEnable = function (enabled) {
		var that = this;

		var audioStream = that.localStream.getAudioTracks()[0];
		if (enabled) {
			audioStream.enabled = true;
			audioStream.muted = true;
		} else {
			audioStream.enabled = false;
			audioStream.muted = false;
		}
	};

	// 设置本地视频是否打开
	RtcpKit.prototype.setLocalVideoEnable = function (enabled) {
		var that = this;

		var videoStream = that.localStream.getVideoTracks()[0];
		if (enabled) {
			videoStream.enabled = true;
		} else {
			videoStream.enabled = false;
		}
	};

	/**
	 *  设置本地视频采集窗口
	 *  @params DRender     Video视频容器窗口 DOM节点
	 **/
	RtcpKit.prototype.setLocalVideoCapturer = function (DRender) {
		var that = this;
		that.anyRTC.createStream(DRender);
	};

	/**
	 *  设置推流视频质量
	 *  @params strVideoMode       RTMPC_Video_SD | RTMPC_Video_HD
	 *  参数说明：
	 *  RTMPC_Video_SD  640*480     512 kbps
	 *  RTMPC_Video_HD  1080*720    1024 kbps
	 **/
	RtcpKit.prototype.setVideoMode  = function (strVideoMode) {
		var that = this;

		switch (strVideoMode) {
			case 'RTCP_Videos_HD':
				that.VBitrate = 1024;
				that.VWidth = 1280;
				that.VHeight = 720;
				break;
			case 'RTCP_Videos_QHD':
				that.VBitrate = 768;
				that.VWidth = 960;
				that.VHeight = 540;
				break;
			case 'RTCP_Videos_SD':
				that.VBitrate = 512;
				that.VWidth = 640;
				that.VHeight = 480;
				break;
			case 'RTCP_Videos_LOW':
			default:
				that.VBitrate = 384;
				that.VWidth = 352;
				that.VHeight = 288;
				strVideoMode = 'RTCMeet_Videos_LOW';
				break;
		}

		that.anyRTC.liveModel = strVideoMode;
	};

	/**
	 *    设置其他连麦者视频窗口
	 *    @params stream                订阅的RTC远程视频流
	 *    @params dVideoRender          Video视频容器窗口 DOM节点
	 *    将视频流绑定到video标签 设置其他连麦者视频渲染显示
	 **/
	RtcpKit.prototype.setRTCVideoRender = function (stream, dVideoRender) {
		dVideoRender.srcObject = stream;
	};

	// 推流
	RtcpKit.prototype.publish = function (nMediaType, strAnyRTCId) {
		var that = this;

		if (typeof nMediaType === "number") {
			that.isAudioLive = (nMediaType === 1) ? true : false;
		} else {
			that.emit("onPublishFailed", 4);
		}
		if (typeof strAnyRTCId === "string" && typeof strAnyRTCId !== "") {
			that.anyrtcId = strAnyRTCId;
		} else {
			that.emit("onPublishFailed", 4);
		}

		if (that.myNetStatus == 0) {    // init
			that.cachePub = true;
			that.doJoin();
		}
		else if (that.myNetStatus == 1) {   // connecting
			that.cachePub = true;
		}
		else if (that.myNetStatus == 2) {   // ok
			if (that.cachePub == false) {
				that.cachePub = true;
				that.doPublish();
			}
		}
	};

	// 取消推流
	RtcpKit.prototype.unPublish = function () {
		var that = this;
		if (that.cachePub) {
			that.cachePub = false;
			if (that.pubChanId != "") {
				that.doUnPublish(that.pubChanId);
				that.pubChanId = "";
			}
		}

		that.doCheckNetStatus();
	};

	// 订阅
	RtcpKit.prototype.subscribe = function (pubId) {
		var that = this;
		if (that.myNetStatus == 0) {
			that.subsId[pubId] = true;
			that.doJoin();
		}
		else if (that.myNetStatus == 1) {
			that.subsId[pubId] = true;
		}
		else if (that.myNetStatus == 2) {
			if (that.subsId[pubId] == undefined) {
				that.subsId[pubId] = true;
				that.doSubscribe(pubId);
			}
		}
	};

	// 取消订阅
	RtcpKit.prototype.unSubscribe = function (pubId) {
		var that = this;
		if (that.subsId[pubId] != undefined) {
			delete that.subsId[pubId];
			that.doUnSubscribe(pubId);
		}

		that.doCheckNetStatus();
	};

	// 断开RTC链接
	RtcpKit.prototype.close = function () {
		var that = this;
		if (that.myDyncId != "") {
			that.request = new XMLHttpRequest();
			var request = that.request;
			request.open("GET", that.url + "/anyapi/v1/disconnect?DyncID=" + that.myDyncId, false);
			request.send();
			that.myDyncId = "";
		}
		that.anyRTC.destroyAll();
	};

	exports.RtcpKit = RtcpKit;
})(window);