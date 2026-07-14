# Class Tracker

React Native CLI + Firebase mobile app for student attendance and activity monitoring. The MVP supports teacher and student roles, protected login, class management, student records, attendance, activities, scores, reports, and announcements.

## Stack

- React Native CLI 0.73 with TypeScript
- Firebase Authentication, Firestore, and Storage
- React Navigation
- React Native Paper
- Context API for auth state

## Setup

Install dependencies:

```bash
npm install
```

Android Firebase setup:

1. Create a Firebase project.
2. Add Android app ID `com.studentmonitoringap`.
3. Download `google-services.json`.
4. Place it at `android/app/google-services.json`.

iOS Firebase setup:

1. Add iOS app ID `com.studentmonitoringapp`.
2. Download `GoogleService-Info.plist`.
3. Add it to `ios/StudentMonitoringApp/` through Xcode.
4. Run:

```bash
cd ios
pod install
cd ..
```

Run the app:

```bash
npm start
npm run android
npm run ios
```

## Firestore Collections

```text
users/{userId}
classes/{classId}
students/{studentId}
attendance/{attendanceId}
activities/{activityId}
activitySubmissions/{submissionId}
announcements/{announcementId}
```

Attendance IDs use:

```text
{classId}_{studentId}_{YYYY-MM-DD}
```

Activity submission IDs use:

```text
{activityId}_{studentId}
```

These deterministic IDs let teachers update existing records without creating duplicates.

## First Teacher Account

1. Create an email/password user in Firebase Authentication.
2. Add `users/{uid}` in Firestore:

```json
{
  "uid": "AUTH_UID",
  "fullName": "Sir John",
  "email": "teacher@example.com",
  "role": "teacher",
  "studentId": null,
  "teacherId": "AUTH_UID",
  "classIds": [],
  "status": "active"
}
```

## Student Account Linking

For a student login, create a Firebase Auth user, create or update the corresponding `students/{studentId}`, then add a Firestore user profile:

```json
{
  "uid": "AUTH_UID",
  "fullName": "Juan Dela Cruz",
  "email": "juan@example.com",
  "role": "student",
  "studentId": "STUDENT_DOC_ID",
  "teacherId": null,
  "classIds": ["CLASS_DOC_ID"],
  "status": "active"
}
```

Also set `students/{studentId}.userId` to the Auth UID.

## Verification

```bash
npm run lint
npm test
npm run android
npm run ios
firebase emulators:start --only firestore,auth
```

## MVP Notes

Not included yet: QR attendance, GPS, face recognition, parent portal, payments, report exports, offline mode, and push notifications.
