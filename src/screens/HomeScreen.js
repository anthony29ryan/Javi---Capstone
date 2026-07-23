import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user, logOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Java Learning App</Text>
      <Text>Welcome, {user?.displayName || user?.email}</Text>

      <Pressable style={styles.button} onPress={() => navigation.navigate('Courses')}>
        <Text style={styles.buttonText}>Start Learning</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('EditProfile')}>
        <Text style={styles.secondaryButtonText}>Edit Name</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={logOut}>
        <Text style={styles.secondaryButtonText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#555',
  },
});
