import React, {useState} from 'react';
import {View, SafeAreaView, Button, FlatList, Text} from 'react-native';

import {RTCPeerConnection, RTCView, mediaDevices} from 'react-native-webrtc';
import styles from './WebRtc.style';

import io from 'socket.io-client';
import Config from '../../config/Config';

const WebRtc = () => {
  const [localStream, setLocalStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [cachedLocalPC, setCachedLocalPC] = useState();
  const [socket, setSocket] = useState();
  const [isOnCall, setIsOnCall] = useState(false);
  const [callee, setCallee] = useState();
  const [users, setUsers] = useState([]);

  const callNotStarted = cachedLocalPC !== undefined && !isOnCall;
  const enterApp = () => {
    const newsocket = io('http://192.168.1.12:4000', {
      forceNode: true,
      forceNew: true,
      reconnection: false,
    });

    setSocket(newsocket);
    const pc = new RTCPeerConnection(Config);
    setCachedLocalPC(pc);

    handleUserEvents(newsocket, pc);
    handleOfferEvent(newsocket, pc);
    handleAnswerEvent(newsocket, pc);
    handleHangupEvent(newsocket, pc);
    handleStreamAdded(pc);

    startLocalStream(pc);
  };

  const handleHangupEvent = (newsocket, pc) => {
    newsocket.on('call-ended', () => {
      close();
      newsocket.disconnect();
    });
  };

  const handleStreamAdded = pc => {
    pc.onaddstream = e => {
      setRemoteStream(e.stream);
      if (!isOnCall) setIsOnCall(true);
    };
  };

  const handleAnswerEvent = (newsocket, pc) => {
    newsocket.on('answer-made', async data => {
      await pc.setRemoteDescription(data.answer);

      if (!isOnCall) {
        const offer = await pc.createOffer();
        pc.setLocalDescription(offer);
        newsocket.emit('make-offer', {
          offer: offer,
          to: data.socketId,
        });
        setIsOnCall(true);
      }
    });
  };

  const handleOfferEvent = (newsocket, pc) => {
    newsocket.on('offer-made', async data => {
      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer(data);
      await pc.setLocalDescription(answer);
      newsocket.emit('make-answer', {
        answer: answer,
        to: data.socketId,
      });
    });
  };

  const handleUserEvents = (newsocket, pc) => {
    newsocket.on('update-user-list', data => {
      const usersList = data.users;
      usersList.filter(x => x !== newsocket.id);
      setUsers(usersList);
      console.log(usersList);
    });
    newsocket.on('remove-user', ({socketId}) => {
      const newUsers = users.filter(u => u !== socketId);
      setUsers(newUsers);
    });
  };

  const startLocalStream = async pc => {
    const isFront = true;
    const devices = await mediaDevices.enumerateDevices();

    const facing = isFront ? 'front' : 'environment';
    const videoSourceId = devices.find(
      device => device.kind === 'videoinput' && device.facing === facing,
    );
    const facingMode = isFront ? 'user' : 'environment';
    const constraints = {
      audio: false,
      video: {
        mandatory: {
          minWidth: 500,
          minHeight: 300,
          minFrameRate: 30,
        },
        facingMode,
        optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
      },
    };
    const newStream = await mediaDevices.getUserMedia(constraints);
    setLocalStream(newStream);
    await pc.addStream(newStream);
  };

  const callUser = async id => {
    if (callNotStarted) {
      setCallee(id);
      await startLocalStream(cachedLocalPC);
      const offer = await cachedLocalPC.createOffer();
      await cachedLocalPC.setLocalDescription(offer);
      socket.emit('make-offer', {offer: offer, to: id});
    } else {
      console.log('Call already started');
    }
  };

  const endCall = () => {
    socket?.emit('end-call', {
      to: callee,
    });
    socket.disconnect();
    close();
  };

  const close = async () => {
    await cachedLocalPC?.close();
    setIsOnCall(false);
    setCachedLocalPC();
    setRemoteStream();
    setLocalStream();
    setCallee();
    setSocket();
  };

  const renderUserBtn = item => {
    return <Button title={item} onPress={() => callUser(item)} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      {localStream && isOnCall && (
        <View style={styles.windowRtcContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.rtcSmall}
            zOrder={2}
          />
        </View>
      )}
      {remoteStream && (
        <View style={styles.fullScreenRtcContainer}>
          <RTCView
            streamURL={remoteStream?.toURL()}
            style={styles.rtcBig}
            zOrder={1}
          />
        </View>
      )}
      {remoteStream === undefined && cachedLocalPC && (
        <View style={styles.userMenu}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Users list:</Text>
          </View>
          <FlatList data={users} renderItem={({item}) => renderUserBtn(item)} />
        </View>
      )}
      {remoteStream && <Button title="End call" onPress={() => endCall()} />}
      {cachedLocalPC === undefined && (
        <Button title="Start conversations" onPress={() => enterApp()} />
      )}
    </SafeAreaView>
  );
};

export default WebRtc;
