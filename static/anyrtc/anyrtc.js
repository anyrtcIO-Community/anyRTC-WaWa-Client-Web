/*! anyrtc.js build:0.0.3, development. Copyright(c) 2017 BoYuan@SH */
(function (exports) {
    //var PeerConnection = (window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
	var URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
	var getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
	var nativeRTCIceCandidate = (window.mozRTCIceCandidate || window.RTCIceCandidate);
	var nativeRTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription); // order is very important: "RTCSessionDescription" defined in Nighly but useless
	var moz = !!navigator.mozGetUserMedia;
	var iceServer = {'iceServers': []};

	var VIDEO_MAT_BITRATE = 512;
	var VIDEO_CODEC_PARAM_MAX_BITRATE = "x-google-max-bitrate";
	var VIDEO_CODEC_PARAM_MIN_BITRATE = "x-google-min-bitrate";
	var VIDEO_CODEC_PARAM_START_BITRATE = "x-google-start-bitrate";
	var AUDIO_CODEC_PARAM_BITRATE = "maxaveragebitrate";

	/**********************************************************/
	/*                                                        */
	/*                       事件处理器                       */
	/*                                                        */

	/**********************************************************/
	function EventEmitter () {
		this.events = {};
	}

	//绑定事件函数
	EventEmitter.prototype.on = function (eventName, callback) {
		this.events[eventName] = this.events[eventName] || [];
		this.events[eventName].push(callback);
	};
	//触发事件函数
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
	/*                   流及信道建立部分                     */
	/*                                                        */

	/**********************************************************/


	/*******************基础部分*********************/
	function AnyRTC () {
		if (!(this instanceof AnyRTC)) return new AnyRTC();

		this.pcPuber = null;
		//本地media stream
		this.localMediaStream = null;
    
    //屏幕共享
		this.scrnPuber = null;
		this.scrnMediaStream = null;
    

		this.liveModel = "";
		this.audioLive = false;
		//
		this.subscribers = {};	// 记录pubId对应的chanId
		//保存所有与本地相连的peer connection， 键为peer_id，值为PeerConnection类型
		this.peerConnections = {};

		//初始时需要构建链接的数目
		this.numStreams = 0;
		//初始时已经连接的数目
		this.initializedStreams = 0;
		// RTC内核版本
		this.version = "V2017.09.19.001";
	}

	//继承自事件处理器，提供绑定事件和触发事件的功能
	AnyRTC.prototype = new EventEmitter();

	/*************************服务器连接部分***************************/


	/***********************信令交换部分*******************************/
	//向所有PeerConnection发送Offer类型信令
	AnyRTC.prototype.sendOffer = function (chanId, pc) {
		var that = this;
		var pcCreateOfferCbGen = function (pc, peerId) {
				return function (offer) {
					pc.setLocalDescription(offer);
					var jsJsep = {
						"sdp": offer.sdp,
						"type": offer.type
					};
					var jstr = JSON.stringify({
						"janus": "message",
						"body": {"request": "configure", "audio": true, "video": true},
						"transaction": "x8981",
						"jsep": jsJsep
					});
					//console.log("Offer: " + jstr);
					that.emit('onSendToPeer', chanId, jstr);
				};
			},
			pcCreateOfferErrorCb = function (error) {
				console.log(error);
			};
		pc.createOffer(pcCreateOfferCbGen(pc, chanId), pcCreateOfferErrorCb);
	};

	/***********************发布/订阅流部分*****************************/
	AnyRTC.prototype.createPublisher = function (chanId) {
		var that = this;
		var publisher = that.peerConnections[chanId];
		if (publisher == null) {
			var pc = that.createPeerConnection(chanId);
			that.pcPuber = pc;
			//将本地流添加到PeerConnection实例中
			pc.addStream(that.localMediaStream);
			that.sendOffer(chanId, pc);
		}
	};

	AnyRTC.prototype.destroyPublisher = function (chanId) {
		var that = this;
		var publisher = that.peerConnections[chanId];
		if (publisher != null) {
			that.closePeerConnection(publisher);
			delete that.peerConnections[chanId];	// 删除对象中这个元素
			// that.emit('onMemberLeave', "RTMPC_Hoster");
		}
	};
  
	AnyRTC.prototype.createPublisherEx = function(chanId)
	{
		var that = this;
		var publisher = that.peerConnections[chanId];
		if(publisher == null)
		{
			var pc = that.createPeerConnection(chanId);
			that.scrnPuber = pc;
			//将本地流添加到PeerConnection实例中
			pc.addStream(that.scrnMediaStream);
			that.sendOffer(chanId, pc);
		}
	}
	
	AnyRTC.prototype.destroyPublisherEx = function(chanId)
	{
		var that = this;
		var publisher = that.peerConnections[chanId];
		if(publisher != null)
		{
			that.closePeerConnection(publisher);
			delete that.peerConnections[chanId];	// 删除对象中这个元素
			//that.emit('onMemberLeave', chanId);
		}
		that.scrnPuber = null;
	}
	AnyRTC.prototype.createSubscriber = function (chanId, pubId, offer) {
		var that = this;
		var subscriber = that.peerConnections[chanId];
		if (subscriber == null) {
			that.subscribers[pubId] = chanId;
			var pc = that.createPeerConnection(chanId);
			pc.setRemoteDescription(new nativeRTCSessionDescription(offer), function () {
			}, function (error) {
				console.log(error);
			});
			that.emit('onMemberJoin', pubId);
			pc.createAnswer(function (answer) {
				pc.setLocalDescription(answer);
				console.log("Answer: " + JSON.stringify({
					"sdp": answer.sdp,
					"type": answer.type
				}));
				var jsJsep = {
					"sdp": answer.sdp,
					"type": answer.type
				};
				var jstr = JSON.stringify({
					"janus": "message",
					"body": {"request": "start", "room": "12345"},
					"transaction": "x8981",
					"jsep": jsJsep
				});
				that.emit('onSendToPeer', chanId, jstr);
			}, function (error) {
				console.log(error);
			});
		}
	};

	AnyRTC.prototype.destroySubscriber = function (pubId) {
		var that = this;
		var chanId = that.subscribers[pubId];
		if (chanId != null) {
			var subscriber = that.peerConnections[chanId];
			if (subscriber != null) {
				that.closePeerConnection(subscriber);
				delete that.peerConnections[chanId];
				that.emit('onMemberLeave', pubId);
			}

			delete that.subscribers[pubId];
		}

		return chanId;
	};

	AnyRTC.prototype.destroyAll = function () {
		var that = this;
		for (connection in that.peerConnections) {
			var peerConn = that.peerConnections[connection];
			that.closePeerConnection(peerConn);
			delete that.peerConnections[connection];
		}
	};

	AnyRTC.prototype.getSdpInfo = function (chanId, jstr) {
		var that = this;
		var peerConn = that.peerConnections[chanId];
		if (peerConn != null) {
			var jsBody = JSON.parse(jstr);
			if (jsBody.type != undefined) {
				jsBody.sdp = setBitrate("VP8", true, jsBody.sdp, VIDEO_MAT_BITRATE);
				jsBody.sdp = setBitrate("H264", true, jsBody.sdp, VIDEO_MAT_BITRATE);
				peerConn.setRemoteDescription(new nativeRTCSessionDescription(jsBody), function () {
				}, function (error) {
					console.log(error);
				});
			}
			else {
				var candidate = new nativeRTCIceCandidate({
					sdpMLineIndex: jsBody.sdpMLineIndex,
					candidate: jsBody.candidate
				});
				peerConn.addIceCandidate(candidate);
			}
		}
	};

	/*************************流媒体处理部分***************************/
	//创建本地流
	AnyRTC.prototype.createStream = function (DRender) {
		var that = this;

		// 设置码率
		var VideoOptions;

		switch (that.liveModel) {
			case 'RTMPC_Video_HD':
			case 'RTCMeet_Videos_HD':
				VIDEO_MAT_BITRATE = 1024;

				VideoOptions = {
					"video": that.audioLive ? false : { 'mandatory': { 'maxWidth': 1280, 'maxHeight': 720, 'minWidth': 640, 'minHeight': 480, 'maxFrameRate': 15}},
					"audio": true
				};
				break;
			case 'RTCMeet_Videos_QHD':
				VIDEO_MAT_BITRATE = 768;

				VideoOptions = {
					"video": that.audioLive ? false : { 'mandatory': { 'maxWidth': 960, 'maxHeight': 540, 'minWidth': 640, 'minHeight': 480, 'maxFrameRate': 15}},
					"audio": true
				};
				break;
			case 'RTMPC_Video_SD':
			case 'RTCMeet_Videos_SD':
				VIDEO_MAT_BITRATE = 512;

				VideoOptions = {
					"video": that.audioLive ? false : { 'mandatory': { 'maxWidth': 640, 'maxHeight': 480, 'minWidth': 352, 'minHeight': 288, 'maxFrameRate': 15}},
					"audio": true
				};
				break;
			case 'RTCMeet_Videos_LOW':
			default:
				VIDEO_MAT_BITRATE = 384;

				VideoOptions = {
					"video": that.audioLive ? false : { 'width': 352, 'height': 288 },
					"audio": true
				};
				break;
		}

		//options.video = !!options.video;
		//options.audio = !!options.audio;

		if (getUserMedia) {
			this.numStreams++;
			getUserMedia.call(navigator, VideoOptions, function (stream,err) {
				that.localMediaStream = stream;
				that.initializedStreams++;

				// DOM 设置RTC流
				// that.emit("stream_created", stream);
				that.emit("stream_created", stream, that.attachStream(stream, DRender));
				if (that.initializedStreams === that.numStreams) {
					//that.emit("ready");

				}
			},
			function (error) {
				if (error.name === 'ConstraintNotSatisfiedError') {
					console.log('The resolution ' + constraints.video.width.exact + 'x' +
						constraints.video.width.exact + ' px is not supported by your device.');
				} else if (error.name === 'PermissionDeniedError') {
					console.log('Permissions have not been granted to use your camera and ' +
						'microphone, you need to allow the page access to your devices in ' +
						'order for the demo to work.');
				} else {
					console.log('getUserMedia error: ' + error.name, error);
				}

				that.emit("stream_create_error", 7);
			});
		} else {
			console.error('WebRTC is not yet supported in this browser.');
			that.emit("stream_create_error", 9);    //AnyRTC_EXP_NOT_SUPPORT_WEBRTC = 9
		}
	};

	//将本地流添加到所有的PeerConnection实例中
	AnyRTC.prototype.addStreams = function () {
		var that = this;
		var i, m,
			stream,
			connection;
		for (connection in this.peerConnections) {
			that.peerConnections[connection].addStream(that.localMediaStream);
		}
	};

	//将流绑定到video标签上用于输出
	AnyRTC.prototype.attachStream = function (stream, DRender) {
		var element = DRender;
		element.muted = true;
		element.autoplay = "autoplay";
		// if (navigator.mozGetUserMedia) {
		// 	element.mozSrcObject = stream;
		// 	element.play();
		// } else {
		// 	element.src = URL.createObjectURL(stream);
		// }
		element.srcObject = stream;

		return element;
	};

	/***********************点对点连接部分*****************************/

	//创建单个PeerConnection
	AnyRTC.prototype.createPeerConnection = function (chanId) {
		var that = this;
		var pc = new RTCPeerConnection(iceServer);
		this.peerConnections[chanId] = pc;
		pc.onicecandidate = function (evt) {
			if (evt.candidate) {
				var jsCan = {
					"candidate": evt.candidate.candidate,
					"sdpMLineIndex": evt.candidate.sdpMLineIndex,
					"sdpMid": evt.candidate.sdpMid
				};
				var jstr = JSON.stringify({
					"janus": "trickle",
					"body": {"request": "configure", "audio": true, "video": true},
					"candidate": jsCan
				});
				that.emit('onSendToPeer', chanId, jstr);
			}
		};

		pc.onopen = function () {
			//* that.emit("pc_opened", chanId, pc);
		};

		pc.onaddstream = function (evt) {
			var pubId = "";
			for(var pid in that.subscribers) {
				if(that.subscribers[pid] == chanId) {
					pubId = pid;
					break;
				}
			}
			that.emit('onRemoteStream', evt.stream, pubId);
		};

		pc.ondatachannel = function (evt) {
			//* that.emit('pc_add_data_channel', evt.channel, chanId, pc);
		};
		return pc;
	};

	//关闭PeerConnection连接
	AnyRTC.prototype.closePeerConnection = function (pc) {
		if (!pc) return;
		pc.close();
	};

	/**********************************************************/
	/*                                                        */
	/*                       公用函数体                       */
	/*                                                        */

	/**********************************************************/
	function setBitrate (codec, isVideoCodec, sdpDescription, bitrateKbps) {
		var lines = sdpDescription.split("\r\n");
		var rtpmapLineIndex = -1;
		var sdpFormatUpdated = false;
		var codecRtpMap = null;
		// Search for codec rtpmap in format
		// a=rtpmap:<payload type> <encoding name>/<clock rate> [/<encoding parameters>]
		var regex = "^a=rtpmap:(\\d+) " + codec + "(/\\d+)+[\r]?$";
		var codecPattern = new RegExp(regex);
		for (i = 0; i < lines.length - 1; i++) {
			var codecMatcher = lines[i].match(codecPattern);
			if (codecMatcher != null) {
				codecRtpMap = codecMatcher[1];
				rtpmapLineIndex = i;
				break;
			}
		}
		if (codecRtpMap == null) {
			console.log("No rtpmap for " + codec + " codec");
			return sdpDescription;
		}
		console.log("Found " + codec + " rtpmap " + codecRtpMap
			+ " at " + lines[rtpmapLineIndex]);
		// Check if a=fmtp string already exist in remote SDP for this codec and
		// update it with new bitrate parameter.
		regex = "^a=fmtp:" + codecRtpMap + " \\w+=\\d+.*[\r]?$";
		codecPattern.compile(regex);
		for (i = 0; i < lines.length - 1; i++) {
			var codecMatcher = lines[i].match(codecPattern);
			if (codecMatcher != null) {
				console.log("Found " + codec + " " + lines[i]);
				if (isVideoCodec) {
					lines[i] += "; " + VIDEO_CODEC_PARAM_MAX_BITRATE
						+ "=" + bitrateKbps;
				} else {
					lines[i] += "; " + AUDIO_CODEC_PARAM_BITRATE
						+ "=" + (bitrateKbps * 1000);
				}
				console.log("Update remote SDP line: " + lines[i]);
				sdpFormatUpdated = true;
				break;
			}
		}

		var newSdpDescription = "";
		for (i = 0; i < lines.length - 1; i++) {
			newSdpDescription += lines[i] + "\r\n";
			// Append new a=fmtp line if no such line exist for a codec.
			if (!sdpFormatUpdated && i == rtpmapLineIndex) {
				var bitrateSet;
				if (isVideoCodec) {
					bitrateSet = "a=fmtp:" + codecRtpMap + " "
						+ VIDEO_CODEC_PARAM_MAX_BITRATE + "=" + bitrateKbps;
				} else {
					bitrateSet = "a=fmtp:" + codecRtpMap + " "
						+ AUDIO_CODEC_PARAM_BITRATE + "=" + (bitrateKbps * 1000);
				}
				console.log("Add remote SDP line: " + bitrateSet);
				newSdpDescription += bitrateSet + "\r\n";
			}
		}

		return newSdpDescription;
	}

	exports.AnyRTC = AnyRTC;
})(this);
