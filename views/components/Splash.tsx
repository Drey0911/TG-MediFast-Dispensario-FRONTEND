import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated, Easing } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

interface SplashProps {
  navigation: StackNavigationProp<RootStackParamList, 'Splash'>;
  nextScreen: 'Login' | 'Home';
}

const Splash: React.FC<SplashProps> = ({ navigation, nextScreen }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();

    // Timer para navegar después de la animación
    const timer = setTimeout(() => {
      navigation.replace(nextScreen);
    }, 1500); 

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim, navigation, nextScreen]);

  return (
    <View style={styles.container}>
      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }}>
        <Image 
          source={require('../../img/icon-white.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.text}>MEDIFAST</Text>
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

export default Splash;