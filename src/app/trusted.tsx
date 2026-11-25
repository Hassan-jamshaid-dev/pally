import { useState } from 'react';
import { Linking, StyleSheet, TextInput, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/presentation/components/app-text';
import { BigButton } from '@/presentation/components/big-button';
import { Mascot, Screen } from '@/presentation/components/screen';
import { usePally } from '@/presentation/pally-context';
import { useTheme } from '@/presentation/use-theme';

export default function Trusted() {
  const { c } = useTheme();
  const { prefs, updatePrefs } = usePally();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');

  const save = async () => {
    if (!name.trim()) return;
    await updatePrefs({ trusted: [...prefs.trusted, { id: String(Date.now()), name: name.trim(), phone: phone.trim(), relation: relation.trim() }] });
    setName(''); setPhone(''); setRelation(''); setAdding(false);
  };
  const input = [styles.input, { backgroundColor: c.card, color: c.text }];

  return (
    <Screen title="Your Trusted People" back>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Mascot size={110} />
        <Text style={styles.sub}>Add someone you trust who can help when you need an extra hand. Saved only on this phone.</Text>
      </View>
      {prefs.trusted.map((p) => (
        <View key={p.id} style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.name, { color: c.tealDark }]}>{p.name}</Text>
          <Text style={styles.sub}>{[p.relation, p.phone].filter(Boolean).join(' · ')}</Text>
          {p.phone ? <BigButton label={'Call ' + p.name} variant="secondary" onPress={() => Linking.openURL('tel:' + p.phone)} /> : null}
          <BigButton label="Remove" variant="secondary" onPress={() => updatePrefs({ trusted: prefs.trusted.filter((t) => t.id !== p.id) })} />
        </View>
      ))}
      {adding ? (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={colors.muted} accessibilityLabel="Name" style={input} />
          <TextInput value={relation} onChangeText={setRelation} placeholder="Who are they? (Son, friend…)" placeholderTextColor={colors.muted} accessibilityLabel="Relationship" style={input} />
          <TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" placeholderTextColor={colors.muted} accessibilityLabel="Phone number" style={input} />
          <BigButton label="Save" disabled={!name.trim()} onPress={save} />
          <BigButton label="Cancel" variant="secondary" onPress={() => setAdding(false)} />
        </View>
      ) : (
        <BigButton label="Add a Trusted Person" onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 16, gap: 10, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6 },
  name: { fontSize: 22, fontWeight: '900' },
  sub: { fontSize: 17, lineHeight: 24, color: colors.muted, textAlign: 'center' },
  input: { minHeight: 60, borderRadius: 18, paddingHorizontal: 16, fontSize: 20, borderWidth: 2, borderColor: colors.sage },
});
