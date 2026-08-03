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
- Student: `/student/overview`, `/student/classes`, `/student/activities`, `/student/attendance`, `/student/announcements`, `/student/profile`
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
