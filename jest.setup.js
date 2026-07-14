jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({name: '[DEFAULT]'})),
}));

jest.mock('@react-native-firebase/auth', () => {
  const auth = {};
  return {
    getAuth: jest.fn(() => auth),
    onAuthStateChanged: jest.fn((_auth, callback) => {
      callback(null);
      return jest.fn();
    }),
    createUserWithEmailAndPassword: jest.fn(),
    deleteUser: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
  };
});

jest.mock('@react-native-firebase/firestore', () => {
  const db = {};
  const collectionRef = {id: 'collection'};
  const documentRef = {id: 'document'};
  return {
    Timestamp: {
      fromDate: jest.fn(date => date),
    },
    collection: jest.fn(() => collectionRef),
    doc: jest.fn(() => documentRef),
    getDoc: jest.fn(),
    getDocs: jest.fn(() => Promise.resolve({docs: []})),
    getFirestore: jest.fn(() => db),
    limit: jest.fn(value => ({type: 'limit', value})),
    query: jest.fn((reference, ...constraints) => ({reference, constraints})),
    serverTimestamp: jest.fn(() => new Date()),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    where: jest.fn((field, operator, value) => ({field, operator, value})),
    writeBatch: jest.fn(() => ({
      set: jest.fn(),
      commit: jest.fn(),
    })),
  };
});

jest.mock('@react-native-firebase/storage', () => ({
  deleteObject: jest.fn(() => Promise.resolve()),
  getDownloadURL: jest.fn(() =>
    Promise.resolve('https://example.com/image.jpg'),
  ),
  getStorage: jest.fn(() => ({})),
  putFile: jest.fn(() => Promise.resolve()),
  ref: jest.fn((_storage, path) => ({path})),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  getMessaging: jest.fn(() => ({})),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  requestPermission: jest.fn(() => Promise.resolve(1)),
  setBackgroundMessageHandler: jest.fn(),
  subscribeToTopic: jest.fn(() => Promise.resolve()),
  unsubscribeFromTopic: jest.fn(() => Promise.resolve()),
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  AndroidImportance: {HIGH: 4},
  EventType: {PRESS: 1},
  default: {
    createChannel: jest.fn(() => Promise.resolve('announcements')),
    displayNotification: jest.fn(() => Promise.resolve('notification-id')),
    onForegroundEvent: jest.fn(() => jest.fn()),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(() => Promise.resolve({assets: []})),
  launchImageLibrary: jest.fn(() => Promise.resolve({assets: []})),
}));

jest.mock('@react-native-documents/picker', () => ({
  __esModule: true,
  errorCodes: {
    OPERATION_CANCELED: 'OPERATION_CANCELED',
  },
  isErrorWithCode: jest.fn(() => false),
  pick: jest.fn(),
  types: {
    csv: 'text/csv',
    plainText: 'text/plain',
  },
}));

jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
