import {createNavigationContainerRef} from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const openStudentAnnouncements = () => {
  if (!navigationRef.isReady()) {
    return;
  }
  const navigate = navigationRef.navigate as unknown as (
    name: string,
    params?: object,
  ) => void;
  navigate('AnnouncementsTab', {screen: 'StudentAnnouncements'});
};
