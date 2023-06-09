import { useEffect, useState } from 'react';
import { GiftedChat, Bubble, InputToolbar } from 'react-native-gifted-chat';
import MapView from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomActions from './CustomActions';
import {
   StyleSheet,
   View,
   Text,
   Platform,
   KeyboardAvoidingView,
} from 'react-native';

import {
   collection,
   addDoc,
   onSnapshot,
   query,
   orderBy,
} from 'firebase/firestore';

const Chat = ({ isConnected, db, storage, route, navigation }) => {
   const { name, color, userID } = route.params;
   const [messages, setMessages] = useState([]);

   let unsubMessages;

   useEffect(() => {
      navigation.setOptions({ title: name });
      if (isConnected) {
         if (unsubMessages) unsubMessages();
         unsubMessages = null;

         const q = query(
            collection(db, 'messages'),
            orderBy('createdAt', 'desc')
         );
         unsubMessages = onSnapshot(q, (docs) => {
            let newMessages = [];
            docs.forEach((doc) => {
               newMessages.push({
                  id: doc.id,
                  ...doc.data(),
                  createdAt: new Date(doc.data().createdAt.toMillis()),
               });
            });
            cacheMessages(newMessages);
            setMessages(newMessages);
         });
      } else loadCachedMessages();

      return () => {
         if (unsubMessages) unsubMessages();
      };
   }, [isConnected]);

   const loadCachedMessages = async () => {
      const cachedMessages = (await AsyncStorage.getItem('messages')) || [];
      setMessages(JSON.parse(cacheMessages));
   };

   const cacheMessages = async (messagesToCache) => {
      try {
         await AsyncStorage.setItem(
            'messages',
            JSON.stringify(messagesToCache)
         );
      } catch (error) {
         console.log(error.message);
      }
   };

   const onSend = (newMessages) => {
      addDoc(collection(db, 'messages'), newMessages[0]);
   };

   const renderBubble = (props) => {
      return (
         <Bubble
            {...props}
            wrapperStyle={{
               right: {
                  backgroundColor: '#000',
               },
               left: {
                  backgroundColor: '#FFF',
               },
            }}
         />
      );
   };

   const renderInputToolbar = (props) => {
      if (isConnected) return <InputToolbar {...props} />;
      else return null;
   };

   const renderCustomActions = (props) => {
      return <CustomActions storage={storage} {...props} />;
   };

   const renderCustomView = (props) => {
    const { currentMessage} = props;
    if (currentMessage.location) {
      return (
          <MapView
            style={{width: 150,
              height: 100,
              borderRadius: 13,
              margin: 3}}
            region={{
              latitude: currentMessage.location.latitude,
              longitude: currentMessage.location.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          />
      );
    }
    return null;
  }

   return (
      <View style={[styles.container, { backgroundColor: color }]}>
         <GiftedChat
            messages={messages}
            renderBubble={renderBubble}
            renderInputToolbar={renderInputToolbar}
            renderActions={renderCustomActions}
            onSend={(messages) => onSend(messages)}
            renderCustomView={renderCustomView}
            user={{
               _id: userID,
               name,
            }}
         />
         {Platform.OS === 'ios' ? (
            <KeyboardAvoidingView behavior='padding' />
         ) : null}
      </View>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
   },
});

export default Chat;
