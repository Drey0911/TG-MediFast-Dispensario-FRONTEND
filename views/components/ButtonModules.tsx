// components/ButtonModules.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';

interface ButtonModuleProps {
  iconName: string;
  colorIcon?: string;
  title: string;
  description: string;
  onPress?: () => void;
  colors?: string[];
  titleColor?: string;
  descriptionColor?: string;
}

const { width } = Dimensions.get('window');
const BUTTON_SIZE = (width - 70) / 2; 

const ButtonModule: React.FC<ButtonModuleProps> = ({
  iconName,
  colorIcon,
  title,
  description,
  onPress,
  colors = ['#42d68c', '#239c64ff'],
  titleColor = '#239c64ff',
  descriptionColor = '#239c64ff',
}) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.buttonContainer}>
      <LinearGradient
        colors={colors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.iconContainer}>
          <Icon name={iconName} size={35} color={colorIcon} />
        </View>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        <Text style={[styles.description, { color: descriptionColor }]}>{description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    margin: 10,
  },
  gradient: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 10,
  },
  title: {
    color: '#239c64ff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    color: '#239c64ff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 1,
  },
});

export default ButtonModule;