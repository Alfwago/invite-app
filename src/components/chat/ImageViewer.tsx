import { Image, Modal, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/src/components/Tap";

/**
 * A posted photo full screen (1.8.1, owner 2026-11-10): tap a message's
 * picture to open it, pinch to zoom (iOS — Android's ScrollView can't zoom),
 * tap anywhere or the X to close. Animated GIFs keep playing.
 */
export function ImageViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={uri != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <ScrollView
          style={StyleSheet.absoluteFill}
          contentContainerStyle={{ width, height }}
          maximumZoomScale={Platform.OS === "ios" ? 4 : 1}
          minimumZoomScale={1}
          centerContent
          bouncesZoom
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Tap feedback="none" onPress={onClose} accessibilityLabel="Close photo" style={{ width, height }}>
            {uri ? <Image source={{ uri }} style={{ width, height }} resizeMode="contain" /> : null}
          </Tap>
        </ScrollView>
        <Tap
          feedback="icon"
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[styles.close, { top: insets.top + 8 }]}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </Tap>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000" },
  close: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
});
