import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function ScanFrameIcon({ size = 32, color = '#111' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 7V5C3 3.89543 3.89543 3 5 3H7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M17 3H19C20.1046 3 21 3.89543 21 5V7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M21 17V19C21 20.1046 20.1046 21 19 21H17" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M7 21H5C3.89543 21 3 20.1046 3 19V17" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 12H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}