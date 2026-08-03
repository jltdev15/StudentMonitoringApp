# ClassTrack Web Portal

Vue 3 + TypeScript portal for teachers and students, connected to the same Firebase Authentication, Firestore, and Storage data as the mobile app.

## Connect Firebase

Create a Firebase Web app in the existing project and copy its configuration into `.env` using `.env.example`. Enable Email/Password authentication and authorize the deployed portal domain. Accounts require an active `users/{uid}` profile with a `teacher` or `student` role.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run test:run
npm run test:coverage
npm run build
```

Vitest uses jsdom and mocked Firebase boundaries. GitHub Actions runs type checking, coverage, and the production build for portal-related changes.

## Routes

- Public: `/login`, `/register/verify`, `/register/account`, `/verify-email`
- Teacher: `/admin/overview`, `/admin/classes`, `/admin/students`, `/admin/attendance`, `/admin/activities`, `/admin/announcements`, `/admin/reports`, `/admin/utilities`
- Student: `/student/feed` (landing page), `/student/classes`, `/student/activities`, `/student/attendance`, `/student/announcements`, `/student/profile`. The legacy `/student/overview` URL redirects to the feed.
- Quiz: `/student/activities/:activityId/take` and `/student/activities/:activityId/review`

Guards wait for Firebase Authentication initialization before enforcing active profiles and roles. The selected teacher class is represented by `?class=<classId>` so class context survives navigation and direct links.

## Architecture

- `src/router` owns URL routing and role access policy.
- `src/stores` owns authentication, teacher/student workspace state, selected class, and notifications.
- `src/services` provides domain-specific Firebase boundaries; components and stores do not import Firebase SDK modules directly.
- `src/composables` contains reusable dialog, navigation, WebP optimization, and file download behavior.
- `src/components` contains reusable shell and feedback UI.
- `src/domain` contains typed, Firebase-independent quiz extraction and scoring.

`App.vue` is intentionally a small composition root containing only `RouterView` and global feedback.

## Firebase Hosting

The repository `firebase.json` serves `teacher-portal/dist` and rewrites all application paths to `index.html`, so direct links and browser refreshes work. Run `npm run build` before deploying Firebase Hosting.

## Global Student Feed Release

The global feed uses trusted Firebase functions to publish sanitized `feedPosts` from global announcements, scheduled attendance sessions, and closed activities. Activity-achiever posts are also refreshed whenever a related score or submission changes, so score adjustments made after closing remain synchronized. Students can read these posts but can only like or select an approved comment through callable functions.

Deploy the backend before releasing the feed UI:

```bash
firebase deploy --only firestore:rules,functions,hosting
```

After deployment, sign in as an active teacher and open **Utilities → Update student feed**. The callable function performs the idempotent 30-day backfill using trusted Firebase credentials.

The local script remains available for release automation:

```bash
cd functions
npm run backfill:feed
npm run backfill:feed -- --apply
```

The first command is a dry run and does not modify Firestore. Local execution uses the Firebase Admin SDK, whose credentials are separate from `firebase login`. Authenticate once before running it:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project student-mngt-6ca8e
```
