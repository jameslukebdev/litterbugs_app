import { Alert } from 'react-native';

export function showPhotoReviewInfo() {
  Alert.alert('About photo review', 'Photos are stored by Litterbugs and checked by Cloudmersive for unsafe files. Report and cleanup photos may also be reviewed by Google Gemini for photo clarity, litter, hazards, and cleanup progress. AI can make mistakes; it does not send rewards.', [{ text: 'Done' }]);
}
