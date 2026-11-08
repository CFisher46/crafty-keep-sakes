import { Hr, Text } from 'react-email';

export default function EmailFooter() {
  return (
    <>
      <Hr style={{ borderColor: '#E4DDD3' }} />
      <Text style={{ color: '#6F675F', fontSize: '12px' }}>
        If you didn&apos;t create an account with Crafty Keepsakes, you can safely ignore this email.
      </Text>
    </>
  );
}