import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, type } from '../theme/colors';

function ActionRow({ label, onPress, isLast, destructive }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      {!destructive ? <Text style={styles.rowChevron}>›</Text> : null}
    </Pressable>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logOut } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <Avatar user={user} size={76} />
        <Text style={styles.name}>{user?.displayName || 'No name set'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.group}>
        <ActionRow label="Edit name" onPress={() => navigation.navigate('EditProfile')} isLast />
      </View>

      <View style={styles.group}>
        <ActionRow label="Log out" onPress={logOut} isLast destructive />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  identity: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  email: {
    ...type.small,
    color: colors.textMuted,
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    marginTop: spacing.lg,
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.primarySoft,
  },
  rowLabel: {
    fontSize: 16,
    color: colors.text,
  },
  rowLabelDestructive: {
    color: colors.error,
  },
  rowChevron: {
    fontSize: 24,
    color: colors.borderStrong,
    marginTop: -3,
  },
});
