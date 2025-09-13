import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const BrandHeader: React.FC = () => {
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
    paddingTop: 30,
    paddingBottom: -10,
  },
  logoTint: {
    width: 180,
    height: 60,
    tintColor: '#FAFAFA', 
  },
});

export default BrandHeader;
