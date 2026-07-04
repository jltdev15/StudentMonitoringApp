import React from 'react';
import {Image, ImageResizeMode, ImageStyle, StyleProp} from 'react-native';

export type TeacherAnimationName =
  | 'idle'
  | 'wave'
  | 'talking'
  | 'thinking'
  | 'success'
  | 'presenting'
  | 'sad';

type Props = {
  animation?: TeacherAnimationName;
  width?: number;
  height?: number;
  resizeMode?: ImageResizeMode;
  style?: StyleProp<ImageStyle>;
};

const teacherAnimationSources: Record<TeacherAnimationName, number> = {
  idle: require('../assets/animated_teacher_gifs/256/teacher_idle_breathing.gif'),
  presenting: require('../assets/animated_teacher_gifs/256/teacher_presenting.gif'),
  sad: require('../assets/animated_teacher_gifs/256/teacher_sad.gif'),
  success: require('../assets/animated_teacher_gifs/256/teacher_success.gif'),
  talking: require('../assets/animated_teacher_gifs/256/teacher_talking.gif'),
  thinking: require('../assets/animated_teacher_gifs/256/teacher_thinking.gif'),
  wave: require('../assets/animated_teacher_gifs/256/teacher_wave.gif'),
};

export const TeacherAnimation = ({
  animation = 'idle',
  width = 220,
  height = 220,
  resizeMode = 'contain',
  style,
}: Props) => (
  <Image
    accessibilityIgnoresInvertColors
    resizeMode={resizeMode}
    source={teacherAnimationSources[animation] || teacherAnimationSources.idle}
    style={[{height, width}, style]}
  />
);
