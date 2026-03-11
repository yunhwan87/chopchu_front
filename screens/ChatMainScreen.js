import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ChatListScreen } from './ChatListScreen';
import { ChatRoomScreen } from './ChatRoomScreen';

export const ChatMainScreen = ({ project, onSetTabBarVisibility }) => {
    const [currentRoom, setCurrentRoom] = useState(null);

    useEffect(() => {
        if (onSetTabBarVisibility) {
            onSetTabBarVisibility(!currentRoom);
        }
    }, [currentRoom, onSetTabBarVisibility]);

    // if (!project) return null; // 유저 요청: 참여 중인 모든 채팅방이 보이도록 제거

    if (currentRoom) {
        return (
            <View style={styles.container}>
                <ChatRoomScreen
                    room={currentRoom}
                    project={project}
                    onBack={() => setCurrentRoom(null)}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ChatListScreen
                project={project}
                onEnterRoom={setCurrentRoom}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
});
