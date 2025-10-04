import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

interface LoadingProps {
  visible?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ visible = true }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ]).start();

      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [fadeAnim, slideAnim, rotateAnim, visible]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }}>
        <Animated.Image 
          source={require('../../img/icon-white.png')} 
          style={[
            styles.logo,
            {
              transform: [{ rotate: rotate }]
            }
          ]}
          resizeMode="contain"
        />
        <Text style={styles.text}>Cargando...</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
  },
  text: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#56e9b6',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 2,
  },
});

export default Loading;