import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TextInputProps, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface CustomInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  showTogglePassword?: boolean; // 👈 Nuevo
}

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  showTogglePassword = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <TextInput
        style={[
          styles.input,
          (isFocused || value) && styles.inputFocused,
          showTogglePassword && styles.inputWithIcon, 
        ]}
        placeholder={isFocused ? placeholder : ''}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !isPasswordVisible}
        placeholderTextColor="#9e9e9e"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />

      {showTogglePassword && (
        <TouchableOpacity
          style={styles.iconContainer}
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
        >
          <Icon
            name={isPasswordVisible ? 'eye-off' : 'eye'}
            size={20}
            color="#7b7a7a"
          />
        </TouchableOpacity>
      )}

      <Text
        style={[
          styles.userLabel,
          (isFocused || value) && styles.userLabelFocused,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    position: 'relative',
    marginBottom: 9,
    width: '100%',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#7b7a7aff',
    borderRadius: 16,
    backgroundColor: 'transparent',
    padding: 16,
    fontSize: 16,
    color: '#323232ff',
  },
  inputWithIcon: {
    paddingRight: 45,
  },
  inputFocused: {
    borderColor: '#2c9960ff',
  },
  userLabel: {
    position: 'absolute',
    left: 16,
    top: 16,
    color: '#7b7a7aff',
    fontSize: 16,
    pointerEvents: 'none',
  },
  userLabelFocused: {
    transform: [{ translateY: -20 }],
    fontSize: 14,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 4,
    color: '#2c9960ff',
    left: 12,
  },
  iconContainer: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
});

export default CustomInput;
