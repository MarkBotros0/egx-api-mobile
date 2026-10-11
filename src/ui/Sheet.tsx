import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "./AppText";
import { IconButton } from "./IconButton";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Fires after the dismiss animation finishes (iOS only; RN Modal semantics). */
  onDismiss?: () => void;
  title?: string;
  children: ReactNode;
}

/** Bottom sheet modal. Replaces the web's tooltips, popovers and mobile full-screen forms. */
export function Sheet({ visible, onClose, onDismiss, title, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-end">
        <Pressable accessibilityLabel="Dismiss" className="absolute inset-0 bg-black/60" onPress={onClose} />
        <View
          className="max-h-[92%] rounded-t-2xl border border-white/10 bg-charcoal"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-center justify-between px-4 pt-2">
            <AppText className="font-sans-semibold text-base text-white">{title ?? ""}</AppText>
            <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} />
          </View>
          <ScrollView contentContainerClassName="px-4 pb-2" keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
