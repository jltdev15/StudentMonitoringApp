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

jest.mock('@react-native-firebase/storage', () => () => ({}));

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
