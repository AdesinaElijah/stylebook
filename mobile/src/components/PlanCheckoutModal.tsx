import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Simulated checkout for shop subscription upgrades.
 *
 * <p>StyleBook does not process payments. This walks through the shape a real Ghanaian
 * checkout would take — mobile money prompt or card entry, then authorisation — so the
 * upgrade is a deliberate act rather than a single tap, and so the flow can be demonstrated
 * end to end. Nothing is charged and no card data leaves the device; the fields exist to
 * make the sequence legible, not to be transmitted anywhere.
 *
 * <p>Every screen carries a demo banner. Presenting a fake payment as a real one would be
 * the wrong kind of convincing.
 */

const MOMO_NETWORKS = ['MTN', 'Telecel', 'AirtelTigo'];

/**
 * Defined at module scope on purpose.
 *
 * <p>This started life inside PlanCheckoutModal, which meant React saw a brand-new
 * component type on every render. Typing a digit changed state, which re-rendered the
 * sheet, which produced a different Field type — so React unmounted the TextInput and
 * mounted a fresh one, losing focus and dropping keystrokes. Hoisting it out keeps the
 * same component identity across renders, so the input holds focus while you type.
 */
function Field({ label, theme, ...input }: any) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, {
          backgroundColor: theme.input, color: theme.text, borderColor: theme.border,
        }]}
        placeholderTextColor={theme.textTertiary}
        {...input}
      />
    </View>
  );
}

type Props = {
  visible: boolean;
  planName: string | null;
  price: string;
  onCancel: () => void;
  /** Fired once the simulated authorisation succeeds. */
  onPaid: () => void;
};

type Stage = 'details' | 'processing' | 'done';

export default function PlanCheckoutModal({ visible, planName, price, onCancel, onPaid }: Props) {
  const { theme } = useTheme();

  const [method, setMethod] = useState<'MOMO' | 'CARD'>('MOMO');
  const [network, setNetwork] = useState('MTN');
  const [phone, setPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [stage, setStage] = useState<Stage>('details');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // Timers are cleared on unmount so a dismissed sheet can't fire callbacks later.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // Fresh sheet every time it opens, so a previous attempt never leaks in.
  useEffect(() => {
    if (visible) {
      setStage('details');
      setStatus('');
      setError('');
    } else {
      clearTimers();
    }
  }, [visible]);

  const digitsOnly = (value: string) => value.replace(/\D/g, '');

  const validate = (): string | null => {
    if (method === 'MOMO') {
      if (digitsOnly(phone).length !== 10) {
        return 'Enter the 10-digit mobile money number';
      }
      return null;
    }
    if (digitsOnly(cardNumber).length !== 16) return 'Enter the 16-digit card number';
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Expiry must be MM/YY';
    if (digitsOnly(cvv).length !== 3) return 'CVV must be 3 digits';
    return null;
  };

  /**
   * Runs the authorisation theatre. The staged messages mirror what a real mobile money
   * charge feels like — the shop owner would genuinely be waiting on a prompt on their phone.
   */
  const pay = () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError('');
    setStage('processing');

    const steps: [string, number][] = method === 'MOMO'
      ? [
          ['Contacting payment provider…', 0],
          [`Prompt sent to ${network} ${phone}`, 1200],
          ['Waiting for you to approve on your phone…', 2600],
          ['Authorising…', 4400],
        ]
      : [
          ['Contacting payment provider…', 0],
          ['Verifying card…', 1300],
          ['Authorising…', 2900],
        ];

    steps.forEach(([text, delay]) => {
      timers.current.push(setTimeout(() => setStatus(text), delay));
    });

    const total = method === 'MOMO' ? 5800 : 4200;
    timers.current.push(setTimeout(() => setStage('done'), total));
  };

  const finish = () => {
    clearTimers();
    onPaid();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        style={styles.overlay}
        onPress={() => stage === 'details' && onCancel()}
      />

      {/* Lifts the sheet above the keyboard — the numeric keypad was covering the
          number field and the Pay button entirely. */}
      <KeyboardAvoidingView
        style={styles.sheetWrap}
        // 'height' on Android to match every other screen in the app. Undefined relies on
        // the window resizing for the keyboard, which edge-to-edge mode prevents.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
      <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={[styles.demoBanner, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}>
          <Text style={[styles.demoText, { color: theme.accent }]}>
            Demo checkout — no money is charged
          </Text>
        </View>

        {stage === 'details' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: theme.text }]}>Upgrade to {planName}</Text>
            <Text style={[styles.price, { color: theme.accent }]}>{price}</Text>

            <View style={styles.methodRow}>
              {(['MOMO', 'CARD'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.methodChip,
                    { borderColor: method === option ? theme.accent : theme.border },
                    method === option && { backgroundColor: theme.accentLight },
                  ]}
                  onPress={() => { setMethod(option); setError(''); }}
                >
                  <Text style={[
                    styles.methodChipText,
                    { color: method === option ? theme.accent : theme.textSecondary },
                  ]}>
                    {option === 'MOMO' ? '📱  Mobile Money' : '💳  Card'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {method === 'MOMO' ? (
              <>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Network</Text>
                <View style={styles.networkRow}>
                  {MOMO_NETWORKS.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.networkChip,
                        { borderColor: network === item ? theme.accent : theme.border },
                        network === item && { backgroundColor: theme.accentLight },
                      ]}
                      onPress={() => setNetwork(item)}
                    >
                      <Text style={[
                        styles.networkChipText,
                        { color: network === item ? theme.accent : theme.textSecondary },
                      ]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Field
                  theme={theme}
                  label="Mobile money number"
                  placeholder="0244 123 456"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={14}
                />
              </>
            ) : (
              <>
                <Field
                  theme={theme}
                  label="Card number"
                  placeholder="4242 4242 4242 4242"
                  keyboardType="number-pad"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  maxLength={19}
                />
                <View style={styles.splitRow}>
                  <View style={styles.splitItem}>
                    <Field
                      theme={theme}
                      label="Expiry"
                      placeholder="MM/YY"
                      value={expiry}
                      onChangeText={setExpiry}
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.splitItem}>
                    <Field
                      theme={theme}
                      label="CVV"
                      placeholder="123"
                      keyboardType="number-pad"
                      secureTextEntry
                      value={cvv}
                      onChangeText={setCvv}
                      maxLength={3}
                    />
                  </View>
                </View>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: theme.accent }]}
              onPress={pay}
            >
              <Text style={styles.payBtnText}>Pay {price.split('/')[0]}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {stage === 'processing' && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.statusText, { color: theme.text }]}>{status}</Text>
            <Text style={[styles.statusHint, { color: theme.textTertiary }]}>
              Please don't close this screen
            </Text>
          </View>
        )}

        {stage === 'done' && (
          <View style={styles.centered}>
            <Text style={styles.tick}>✅</Text>
            <Text style={[styles.doneTitle, { color: theme.text }]}>Payment successful</Text>
            <Text style={[styles.doneSub, { color: theme.textSecondary }]}>
              Your shop is now on the {planName} plan.
            </Text>
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: theme.accent, marginTop: 24 }]}
              onPress={finish}
            >
              <Text style={styles.payBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 32, maxHeight: '88%',
  },
  demoBanner: {
    borderRadius: 10, borderWidth: 1, paddingVertical: 8,
    paddingHorizontal: 12, marginBottom: 18, alignItems: 'center',
  },
  demoText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 21, fontWeight: '800' },
  price: { fontSize: 17, fontWeight: '700', marginTop: 4, marginBottom: 20 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  methodChip: {
    flex: 1, borderRadius: 12, borderWidth: 1.5,
    paddingVertical: 14, alignItems: 'center',
  },
  methodChipText: { fontSize: 14, fontWeight: '700' },
  networkRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 16 },
  networkChip: {
    flex: 1, borderRadius: 10, borderWidth: 1.5,
    paddingVertical: 10, alignItems: 'center',
  },
  networkChipText: { fontSize: 13, fontWeight: '600' },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15 },
  splitRow: { flexDirection: 'row', gap: 12 },
  splitItem: { flex: 1 },
  error: { color: '#f44336', fontSize: 13, marginBottom: 12, fontWeight: '600' },
  payBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  payBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  cancelBtn: { padding: 14, alignItems: 'center', marginBottom: 8 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  centered: { alignItems: 'center', paddingVertical: 48 },
  statusText: { fontSize: 16, fontWeight: '600', marginTop: 20, textAlign: 'center' },
  statusHint: { fontSize: 13, marginTop: 8 },
  tick: { fontSize: 52 },
  doneTitle: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  doneSub: { fontSize: 14, marginTop: 6, textAlign: 'center' },
});
