import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Backdrop } from "@/design/components/Backdrop";
import { Text } from "@/design/components/Text";
import { palette } from "@/design/tokens";
import { getCopy } from "@/i18n";

const NATIVE = Platform.OS !== "web";

/** Mismo tamaño que el logo de la pantalla de carga nativa (app.json → imageWidth 200): el paso no se nota. */
const LOGO_W = 200;
const LOGO_H = Math.round((LOGO_W * 113) / 220);
const RING = 300;
const STROKE = 2;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
/** Tiempo mínimo de la animación; si la app tarda más en cargar, espera a que esté lista. */
const MIN_MS = 2000;

/**
 * Animación de apertura con el logo oficial (nunca recreado): luces de la marca, anillo que se dibuja,
 * logo que "respira" y barra de progreso. Tapa la app hasta que la sesión y las fuentes están listas.
 */
export function LaunchAnimation({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const c = getCopy();
  const glow = useState(() => new Animated.Value(0))[0];
  const ring = useState(() => new Animated.Value(0))[0];
  const breathe = useState(() => new Animated.Value(0))[0];
  const text = useState(() => new Animated.Value(0))[0];
  const progress = useState(() => new Animated.Value(0))[0];
  const exit = useState(() => new Animated.Value(0))[0];
  const [minElapsed, setMinElapsed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const exiting = useRef(false);

  useEffect(() => {
    // El logo animado toma el lugar exacto del logo nativo: se oculta la pantalla de carga del sistema.
    SplashScreen.hideAsync().catch(() => undefined);
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduceMotion(v))
      .catch(() => undefined);
    const timer = setTimeout(() => setMinElapsed(true), MIN_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      glow.setValue(1);
      ring.setValue(1);
      text.setValue(1);
      progress.setValue(1);
      return;
    }
    const easeOut = Easing.out(Easing.cubic);
    Animated.parallel([
      Animated.timing(glow, { toValue: 1, duration: 700, easing: easeOut, useNativeDriver: NATIVE }),
      Animated.timing(ring, { toValue: 1, duration: 1400, delay: 200, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(text, { toValue: 1, duration: 600, delay: 700, easing: easeOut, useNativeDriver: NATIVE }),
      Animated.timing(progress, { toValue: 1, duration: MIN_MS - 200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
        Animated.timing(breathe, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, glow, ring, text, progress, breathe]);

  useEffect(() => {
    if (!ready || !(minElapsed || reduceMotion) || exiting.current) return;
    exiting.current = true;
    Animated.timing(exit, {
      toValue: 1,
      duration: reduceMotion ? 200 : 450,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start(() => onDone());
  }, [ready, minElapsed, reduceMotion, exit, onDone]);

  const logoScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const exitScale = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const opacity = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={c.launch.loading}
      accessibilityViewIsModal
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]}>
        <Backdrop />
      </Animated.View>

      <Animated.View style={[styles.center, { transform: [{ scale: exitScale }] }]}>
        <View style={styles.stage}>
          <RingProgress value={ring} />
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            {/* Logo oficial: nunca se recrea con texto. */}
            <Image source={require("@/assets/brand/carwash505-logo-blanco.png")} style={styles.logo} contentFit="contain" />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.caption,
            { opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
          ]}
        >
          <Text variant="eyebrow" tone="accent" style={styles.tagline}>
            {c.launch.tagline}
          </Text>
          <View style={styles.track}>
            <Animated.View
              style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/** Anillo que se dibuja. Se actualiza con un listener (no con un SVG animado) para funcionar igual en web y en teléfono. */
function RingProgress({ value }: { value: Animated.Value }) {
  const [offset, setOffset] = useState(CIRC);
  useEffect(() => {
    const id = value.addListener(({ value: v }) => setOffset(CIRC * (1 - v)));
    return () => value.removeListener(id);
  }, [value]);
  return (
    <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.cyan} stopOpacity={0.9} />
          <Stop offset="1" stopColor={palette.brand} stopOpacity={0.2} />
        </LinearGradient>
      </Defs>
      <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} fill="none" />
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={R}
        stroke="url(#ring)"
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${CIRC} ${CIRC}`}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: palette.ink, zIndex: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  stage: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
  logo: { width: LOGO_W, height: LOGO_H },
  // Debajo del anillo, sin mover el logo del centro (donde lo deja la pantalla de carga nativa).
  caption: { position: "absolute", top: "50%", marginTop: RING / 2 + 20, left: 0, right: 0, alignItems: "center", gap: 14 },
  tagline: { textAlign: "center" },
  track: { width: 140, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  fill: { height: 2, borderRadius: 1, backgroundColor: palette.cyan },
});
