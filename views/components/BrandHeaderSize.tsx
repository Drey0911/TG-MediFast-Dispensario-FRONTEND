import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BrandHeaderSize: React.FC = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../img/logo-green.png')}
        style={styles.logoTint} 
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.04,
    paddingBottom: SCREEN_HEIGHT * -0.01, 
  },
  logoTint: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_HEIGHT * 0.08, 
    maxWidth: 400, 
    maxHeight: 70,
    tintColor: '#FAFAFA', 
  },
});

export default BrandHeaderSize;