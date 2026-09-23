import { useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { fonts, radius, space, status, touch } from "../tokens";
import { useTheme } from "../theme";
import { Text } from "./Text";

export type FieldProps = TextInputProps & { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, style, onFocus, onBlur, ...rest }: FieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? status.danger : focused ? theme.focus : theme.lineStrong;

  return (
    <View style={styles.wrap}>
      <Text variant="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={theme.fgMuted}
        selectionColor={theme.accent}
        style={[styles.input, { color: theme.fg, borderColor, backgroundColor: theme.bgRaised }, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <Text variant="bodySm" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="bodySm" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  input: {
    minHeight: touch.min + 4,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
  },
});
