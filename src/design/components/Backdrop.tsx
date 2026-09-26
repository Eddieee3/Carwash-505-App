import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { palette } from "../tokens";

/**
 * Fondo ambiental del glassmorphism: luces suaves de la marca (azul y cian) sobre el negro.
 * Es decorativo: no recibe toques ni lo leen los lectores de pantalla.
 */
export function Backdrop() {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="glow-brand" cx="12%" cy="8%" r="65%">
            <Stop offset="0" stopColor={palette.brand} stopOpacity={0.55} />
            <Stop offset="1" stopColor={palette.brand} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow-cyan" cx="95%" cy="45%" r="55%">
            <Stop offset="0" stopColor={palette.cyan} stopOpacity={0.22} />
            <Stop offset="1" stopColor={palette.cyan} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow-deep" cx="30%" cy="100%" r="60%">
            <Stop offset="0" stopColor={palette.brand} stopOpacity={0.3} />
            <Stop offset="1" stopColor={palette.brand} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={palette.ink} />
        <Rect width="100%" height="100%" fill="url(#glow-brand)" />
        <Rect width="100%" height="100%" fill="url(#glow-cyan)" />
        <Rect width="100%" height="100%" fill="url(#glow-deep)" />
      </Svg>
    </View>
  );
}
