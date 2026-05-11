# FindIt — Lost and Found App

React Native (Expo Router) + Firebase project for a campus lost-and-found workflow.

## Added features

- Firebase Authentication
- Firestore real-time lost and found posts
- Admin review before posts become public
- Lost and found post details screen
- Share post button
- Chat/message system between users and the poster
- Claim transaction flow with admin approval
- Claiming an item no longer removes the post from Home
- My reports CRUD for users
- Admin review and claim management
- No Firebase Storage required: images are saved as small base64 URLs in Firestore
- Minimal mobile UI with bottom toasts

## Firestore collections

- users
- categories
- lostItems
- foundItems
- claimRequests
- claimLogs
- reportLogs
- itemMatches
- notifications
- conversations
- messages

## Install

```bash
npm install
npx expo install firebase expo-image-picker @react-native-async-storage/async-storage @expo/vector-icons react-native-gesture-handler react-native-safe-area-context react-native-screens
npx expo start -c
```

## Firestore rules for testing

Paste this in Firebase Console > Firestore Database > Rules:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Admin account

Register normally, then in Firestore go to:

`users > yourUserId > role`

Change `user` to `admin`, save, then log out and log in again.
