import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold } from "@expo-google-fonts/figtree";
import {
  SairaCondensed_500Medium,
  SairaCondensed_600SemiBold,
  SairaCondensed_700Bold,
} from "@expo-google-fonts/saira-condensed";
import { useFonts } from "expo-font";

/** Mismas familias que la web (Saira Condensed para títulos, Figtree para texto). Las claves = `tokens.fonts`. */
export function useAppFonts() {
  return useFonts({
    SairaCondensed_500Medium,
    SairaCondensed_600SemiBold,
    SairaCondensed_700Bold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
  });
}
