# ClassTrack Teacher Portal

Vue 3 teacher workspace connected to the same Firebase Authentication and Firestore data used by the mobile app.

## Connect Firebase

The native mobile configuration does not include a Firebase Web App ID, so create a **Web app** in the existing Firebase project (`student-mngt-6ca8e`) first. Copy its configuration from Firebase Console into a new `.env` file based on `.env.example`.

Enable **Email/Password** in Firebase Authentication and add the final portal domain to Firebase Authentication's authorized domains before publishing. Teacher accounts must have an active `users/{uid}` profile with `role: 'teacher'`, matching the existing mobile app permissions.

## Run locally

```bash
npm install
npm run dev
```

## Main functions

- Teacher sign-in and role validation
- Class and student roster management
- Daily attendance with present, late, absent, and excused statuses
- Activities, score encoding, and activity closing
- Class and general announcements
- Dashboard and basic class reports
- A guarded Utilities reset that deletes the signed-in teacher's attendance,
  activities, activity submissions, and announcements while preserving classes
  and student rosters. Deploy the `resetTeacherData` Cloud Function for this
  action to become available.
