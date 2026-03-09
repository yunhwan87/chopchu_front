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

    if (!project) return null;

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
