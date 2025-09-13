import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TextInputProps } from 'react-native';

interface CustomInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
}

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <TextInput
        style={[
          styles.input,
          (isFocused || value) && styles.inputFocused
        ]}
        placeholder={isFocused ? placeholder : ''}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="#9e9e9e"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      
      <Text style={[
        styles.userLabel,
        (isFocused || value) && styles.userLabelFocused
      ]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    position: 'relative',
    marginBottom: 20,
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
});

export default CustomInput;