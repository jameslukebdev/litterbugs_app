import { useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ReportCardMenu({ actions }) {
  const button = useRef(null);
  const anchor = useRef(null);
  const pendingAction = useRef(null);
  const [open, setOpen] = useState(false);
  const { width, height, fontScale } = useWindowDimensions();
  const menuWidth = Math.min(232, width - 32);
  const rowHeight = Math.max(48, 24 * fontScale + 24);
  const dismiss = () => setOpen(false);
  const show = () => button.current?.measureInWindow((x, y, w, h) => {
    anchor.current = { left: Math.max(16, Math.min(x + w - menuWidth, width - menuWidth - 16)), top: Math.max(16, Math.min(y + h + 4, height - actions.length * rowHeight - 32)) };
    setOpen(true);
  });
  return <>
    <TouchableOpacity ref={button} style={styles.button} accessibilityRole="button" accessibilityLabel="Report options" accessibilityState={{ expanded: open }} onPress={show}>
      <Ionicons name="ellipsis-horizontal" size={22} color="#2F7D32" />
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss} onDismiss={() => { const action = pendingAction.current; pendingAction.current = null; action?.(); }}>
      <View style={{ flex: 1 }} accessibilityViewIsModal onAccessibilityEscape={dismiss}>
        <TouchableOpacity style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Dismiss report options" onPress={dismiss} />
        <View style={[styles.menu, anchor.current, { width: menuWidth }]}>
          {actions.map(action => <TouchableOpacity key={action.text} accessibilityRole="button" style={[styles.option, { minHeight: rowHeight }]} onPress={() => {
            if (Platform.OS === 'ios') pendingAction.current = action.onPress;
            dismiss();
            if (Platform.OS !== 'ios') action.onPress();
          }}>
            <Ionicons name={action.icon} size={20} color="#435047" /><Text style={styles.text}>{action.text}</Text>
          </TouchableOpacity>)}
        </View>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  button: { position: 'absolute', right: 3, top: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  menu: { position: 'absolute', padding: 4, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4EAE5', shadowColor: '#17251A', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 10 },
  text: { flex: 1, color: '#303B34', fontSize: 14, lineHeight: 20 },
});
