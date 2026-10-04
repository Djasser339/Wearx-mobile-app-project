import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/auth-context';

const C = {
  bg: '#F5F6F8', surface: '#FFFFFF', ink: '#0F1115', body: '#3B4049', muted: '#8B929C',
  line: '#ECEEF1', green: '#0F7B55',
};

const FAQS = [
  {
    question: 'Where can I check my order status?',
    answer: 'Open My Orders from your profile to see each order, its current status, delivery address, and items.',
  },
  {
    question: 'Can I change my delivery details?',
    answer: 'Delivery details are attached to an order when it is placed. Check them in My Orders and contact the store as soon as possible if something needs correcting.',
  },
  {
    question: 'What does each order status mean?',
    answer: 'Pending means your order is awaiting confirmation. Confirmed means it is being prepared. Shipped means it is on its way, and Delivered means it has arrived.',
  },
  {
    question: 'An item is missing from my order. What should I do?',
    answer: 'Keep your order number handy and contact the store using the support email configured for this app.',
  },
];

export default function Support() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(0);
  const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

  const contactSupport = async () => {
    const subject = encodeURIComponent('WearX order support');
    const body = encodeURIComponent(`Hello,\n\nI need help with my order.\nAccount email: ${user?.email || ''}\n`);
    await Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`);
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={21} color={C.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>WEARX / ASSISTANCE</Text>
          <Text style={styles.headerTitle}>Help & support</Text>
        </View>
        <View style={styles.headerIcon}><Feather name="headphones" size={17} color={C.ink} /></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>How can we help?</Text>
          <Text style={styles.introText}>Find answers about your orders and delivery.</Text>
        </View>

        <Pressable style={({ pressed }) => [styles.orderLink, pressed && { opacity: 0.75 }]} onPress={() => router.push('/orders')}>
          <View style={styles.orderIcon}><Feather name="package" size={17} color={C.ink} /></View>
          <View style={styles.orderCopy}>
            <Text style={styles.orderTitle}>Order assistance</Text>
            <Text style={styles.orderSubtitle}>Review your purchases and delivery status</Text>
          </View>
          <Feather name="arrow-up-right" size={17} color={C.ink} />
        </Pressable>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Common questions</Text>
          <Text style={styles.faqCount}>0{FAQS.length}</Text>
        </View>
        <View style={styles.faqList}>
          {FAQS.map((faq, index) => {
            const expanded = openFaq === index;
            return (
              <View key={faq.question} style={styles.faqItem}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setOpenFaq(expanded ? -1 : index)}
                  style={styles.faqButton}
                >
                  <Text style={styles.question}>{faq.question}</Text>
                  <Feather name={expanded ? 'minus' : 'plus'} size={17} color={C.body} />
                </Pressable>
                {expanded && <Text style={styles.answer}>{faq.answer}</Text>}
              </View>
            );
          })}
        </View>

        <View style={styles.contact}>
          <View style={styles.contactMark}><Feather name="message-circle" size={17} color={C.green} /></View>
          <Text style={styles.contactTitle}>Still need a hand?</Text>
          {supportEmail ? (
            <>
              <Text style={styles.contactText}>Send our team a note and include your order number.</Text>
              <Pressable onPress={contactSupport} style={styles.contactButton}>
                <Feather name="mail" size={15} color="#fff" />
                <Text style={styles.contactButtonText}>Email support</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.contactText}>Store contact details have not been configured for this build. Check My Orders for current order information.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: C.line },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: C.surface },
  headerCopy: { flex: 1, marginLeft: 12 },
  eyebrow: { color: C.muted, fontSize: 9, fontWeight: '700' },
  headerTitle: { marginTop: 2, color: C.ink, fontSize: 17, fontWeight: '700' },
  headerIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: C.surface },
  content: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 30 },
  intro: { marginBottom: 18 },
  introTitle: { color: C.ink, fontFamily: 'Georgia', fontSize: 25, fontWeight: '700' },
  introText: { marginTop: 6, color: C.body, fontSize: 12, lineHeight: 18 },
  orderLink: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 9, backgroundColor: C.surface },
  orderIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: C.bg },
  orderCopy: { flex: 1, marginHorizontal: 11 },
  orderTitle: { color: C.ink, fontSize: 12, fontWeight: '700' },
  orderSubtitle: { marginTop: 4, color: C.muted, fontSize: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 9 },
  sectionTitle: { color: C.ink, fontSize: 15, fontWeight: '700' },
  faqCount: { color: C.muted, fontSize: 10, fontWeight: '700' },
  faqList: { paddingHorizontal: 14, borderRadius: 9, backgroundColor: C.surface },
  faqItem: { borderBottomWidth: 1, borderBottomColor: C.line },
  faqButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10 },
  question: { flex: 1, color: C.ink, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  answer: { paddingRight: 24, paddingBottom: 14, color: C.body, fontSize: 11, lineHeight: 17 },
  contact: { alignItems: 'center', marginTop: 20, padding: 18, borderRadius: 9, backgroundColor: '#EAF4EF' },
  contactMark: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#D5EBDD' },
  contactTitle: { marginTop: 10, color: C.ink, fontSize: 14, fontWeight: '700' },
  contactText: { maxWidth: 290, marginTop: 6, color: C.body, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  contactButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 7, backgroundColor: C.ink },
  contactButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});