import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  focused?: boolean;
  strokeWidth?: number;
};

function strokeProps(color: string, strokeWidth: number) {
  return {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
}

function fillFrom(color: string, focused?: boolean) {
  return focused ? color : 'none';
}

// ---------------------------------------------------------------------------
// Bottom Tab Icons
// ---------------------------------------------------------------------------

export function HomePlantIcon({
  size = 24,
  color = '#6B4EFF',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 10.5L12 4L20.5 10.5" {...s} />
      <Path d="M5.5 10.5V19.5H18.5V10.5" {...s} />
      <Path d="M9.5 19.5V14.5H14.5V19.5" {...s} />
      <Path d="M15.2 8.1V5.4" {...s} />
      <Path d="M15.2 5.8c.7-1.2 1.9-1.8 3.3-1.6-.3 1.4-1 2.4-2.4 2.9" {...s} />
      <Path d="M15.2 5.8c-.7-1.2-1.9-1.8-3.3-1.6.3 1.4 1 2.4 2.4 2.9" {...s} />
      <Circle cx="15.2" cy="5.8" r="0.9" fill={fillFrom(color, focused)} />
    </Svg>
  );
}

export function GrowthLeafChartIcon({
  size = 24,
  color = '#6B4EFF',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 19.5H19.5" {...s} />
      <Path d="M4.5 19.5V5.5" {...s} />
      <Path d="M6.5 15.8L10.2 12.3L13 13.4L16.9 8.9" {...s} />
      <Path d="M16.5 9c1.2-2.1 3.1-2.9 5.3-2.7-.1 2.3-1.1 4.2-3.3 5.3-1.1.5-2 .5-2.8-.1-.8-.6-.9-1.6-.4-2.5" {...s} />
      <Circle cx="16.9" cy="8.9" r="1" fill={fillFrom(color, focused)} />
    </Svg>
  );
}

export function TeamConnectionIcon({
  size = 24,
  color = '#6B4EFF',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  const glow = focused ? 0.35 : 0.15;
  const line = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    opacity: glow,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="7" y1="7" x2="17" y2="7" {...line} />
      <Line x1="7.8" y1="8.6" x2="12" y2="15.6" {...line} />
      <Line x1="16.2" y1="8.6" x2="12" y2="15.6" {...line} />
      <Circle cx="7" cy="7" r="2.2" {...s} fill={fillFrom(color, focused)} />
      <Circle cx="17" cy="7" r="2.2" {...s} fill={fillFrom(color, focused)} />
      <Circle cx="12" cy="16" r="2.2" {...s} fill={fillFrom(color, focused)} />
    </Svg>
  );
}

export function AskBubbleSeedIcon({
  size = 24,
  color = '#6B4EFF',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5.2 5.8H18.8A2.8 2.8 0 0 1 21.6 8.6V13.4A2.8 2.8 0 0 1 18.8 16.2H13.4L9.5 19.3V16.2H5.2A2.8 2.8 0 0 1 2.4 13.4V8.6A2.8 2.8 0 0 1 5.2 5.8Z" {...s} />
      <Path d="M12 12.9c1.3-.6 2-1.8 2.2-3.3-1.5.1-2.6.8-3.3 2.2-.6 1.1-.5 2.1.1 2.8.7.8 1.8.8 2.9.3" {...s} />
      <Circle cx="14.8" cy="9.1" r="0.7" fill={fillFrom(color, focused)} />
      <Path d="M16.6 7.6V6.4M17.7 8.3H18.9" {...s} />
    </Svg>
  );
}

export function ProfileHaloIcon({
  size = 24,
  color = '#6B4EFF',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="9" r="3.1" {...s} fill={fillFrom(color, focused)} />
      <Path d="M6.7 18.8C8 16.5 9.8 15.2 12 15.2s4 1.3 5.3 3.6" {...s} />
      <Circle cx="12" cy="9" r="6.1" stroke={color} strokeWidth={1.75} fill="none" opacity={focused ? 0.6 : 0.35} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Ask & Learn Icons
// ---------------------------------------------------------------------------

export function PublicGlobeSproutIcon({
  size = 18,
  color = '#6B4EFF',
  focused = false,
  strokeWidth = 1.7,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="11.3" cy="12" r="6.6" {...s} />
      <Path d="M4.9 12H17.7M11.3 5.4C9.6 7.2 9 9.2 9 12C9 14.8 9.6 16.8 11.3 18.6M11.3 5.4C13 7.2 13.6 9.2 13.6 12C13.6 14.8 13 16.8 11.3 18.6" {...s} />
      <Path d="M16.4 7.5c.7-1.2 1.8-1.8 3.2-1.7-.2 1.4-.9 2.5-2.2 3" {...s} />
      <Circle cx="16.6" cy="7.3" r="0.8" fill={fillFrom(color, focused)} />
    </Svg>
  );
}

export function PrivateLockSproutIcon({
  size = 18,
  color = '#6B4EFF',
  focused = false,
  strokeWidth = 1.7,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="6.1" y="10.2" width="11.8" height="8.8" rx="2.4" {...s} />
      <Path d="M8.6 10.2V8.4A3.4 3.4 0 0 1 12 5A3.4 3.4 0 0 1 15.4 8.4V10.2" {...s} />
      <Circle cx="12" cy="14.6" r="1" fill={fillFrom(color, focused)} />
      <Path d="M15.8 6.5c.7-1 1.7-1.5 2.9-1.4-.2 1.3-.8 2.2-2 2.6" {...s} />
    </Svg>
  );
}

export function ReplyLeafIcon({
  size = 16,
  color = '#6B4EFF',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.8 6.4H19.2A2.4 2.4 0 0 1 21.6 8.8V13A2.4 2.4 0 0 1 19.2 15.4H11.7L8.3 18.2V15.4H4.8A2.4 2.4 0 0 1 2.4 13V8.8A2.4 2.4 0 0 1 4.8 6.4Z" {...s} />
      <Path d="M14.2 9.6c1-.4 1.7-1.2 2-2.4-1.1.1-2 .6-2.5 1.6" {...s} />
      <Circle cx="14.2" cy="9.6" r="0.8" fill={fillFrom(color, focused)} />
    </Svg>
  );
}

export function BestAnswerBloomIcon({
  size = 14,
  color = '#059669',
  focused = true,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.8 12.3l3.1 3.1L17.4 8" {...s} />
      <Path d="M12 3.9v2.2M12 17.9v2.2M4.8 12h2.2M17 12h2.2" {...s} opacity={focused ? 0.9 : 0.6} />
    </Svg>
  );
}

export function ReactionHeartSproutIcon({
  size = 14,
  color = '#6B4EFF',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 19.2l-6.4-5.8a3.8 3.8 0 0 1 5.4-5.3L12 9.1l1-1a3.8 3.8 0 0 1 5.4 5.3L12 19.2z" {...s} fill={focused ? 'rgba(107,78,255,0.16)' : 'none'} />
      <Path d="M14.8 6.1c.6-.9 1.5-1.4 2.6-1.3-.2 1.2-.8 2-1.8 2.5" {...s} />
    </Svg>
  );
}

export function ReactionIdeaSparkIcon({
  size = 14,
  color = '#6B4EFF',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8.5 11.2a3.5 3.5 0 1 1 7 0c0 1.4-.7 2.4-1.7 3.2-.7.5-1 1.1-1 1.8H11.2c0-.7-.3-1.3-1-1.8-1-.8-1.7-1.8-1.7-3.2Z" {...s} fill={focused ? 'rgba(107,78,255,0.12)' : 'none'} />
      <Path d="M10.4 18.1h3.2M11 20h2" {...s} />
      <Path d="M17.2 7.2h1.8M16.2 4.8l1.2-1.2M7.8 4.8L6.6 3.6" {...s} />
    </Svg>
  );
}

export function ReactionRiseVineIcon({
  size = 14,
  color = '#6B4EFF',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 18.5h14M6.5 16.5l4.2-4.2 2.5 1.9 4.3-5.3" {...s} />
      <Path d="M17.5 9.1c1.1-.5 1.9-1.3 2.3-2.5-1.2 0-2.2.5-2.9 1.4" {...s} />
      <Circle cx="17.5" cy="9.1" r="0.8" fill={fillFrom(color, focused)} />
    </Svg>
  );
}

export function AskButtonSeedIcon({
  size = 18,
  color = '#FFFFFF',
  focused = true,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <AskBubbleSeedIcon
      size={size}
      color={color}
      focused={focused}
      strokeWidth={strokeWidth}
    />
  );
}

export function VideoBubblePlayIcon({
  size = 18,
  color = '#FFFFFF',
  focused = true,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="8.5" {...s} />
      <Path d="M10.2 8.9L15.3 12L10.2 15.1z" fill={focused ? color : 'none'} stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="10.3" stroke={color} strokeWidth={1.1} fill="none" opacity={focused ? 0.5 : 0.25} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Achievement & Streak Icons
// ---------------------------------------------------------------------------

export function FirstStreakIcon({
  size = 18,
  color = '#D97706',
  focused = true,
  strokeWidth = 1.7,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 20c-3.1 0-5.3-2.3-5.3-5.1 0-2.1 1.3-3.7 2.9-5.2 1.2-1.1 1.8-2.5 2-4.1 2.1 1.8 3.6 4.1 3.6 6.8 1.1-.5 1.9-1.5 2.2-2.8 1.2 1.3 1.9 2.9 1.9 4.8 0 3.3-2.8 5.6-6.3 5.6z" {...s} fill={focused ? 'rgba(217,119,6,0.12)' : 'none'} />
      <Path d="M12.1 10.2c.7-1.1 1.7-1.7 2.9-1.6-.2 1.3-.8 2.2-2 2.7" {...s} />
    </Svg>
  );
}

export function GoalSetterIcon({
  size = 18,
  color = '#6B4EFF',
  focused = true,
  strokeWidth = 1.7,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="7.2" {...s} />
      <Circle cx="12" cy="12" r="3.3" {...s} fill={focused ? 'rgba(107,78,255,0.12)' : 'none'} />
      <Path d="M12 4.8a7.2 7.2 0 0 1 7.2 7.2" {...s} opacity={0.6} />
      <Path d="M12 12c.8-.8 1.9-1.2 3.1-1.1-.2 1.2-.8 2-1.9 2.6" {...s} />
      <Circle cx="12" cy="12" r="0.9" fill={fillFrom(color, focused)} />
    </Svg>
  );
}

export function TeamPlayerVineIcon({
  size = 18,
  color = '#6B4EFF',
  focused = true,
  strokeWidth = 1.7,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="8" cy="9" r="2" {...s} />
      <Circle cx="16" cy="9" r="2" {...s} />
      <Circle cx="12" cy="14.8" r="2" {...s} />
      <Path d="M8 11.1L12 13.2L16 11.1" {...s} />
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.2} fill="none" opacity={focused ? 0.6 : 0.35} />
      <Path d="M16.5 6.4c.8-1 1.7-1.5 2.9-1.4-.2 1.3-.8 2.2-2 2.6" {...s} />
    </Svg>
  );
}

export function StreakBadgeIcon({
  size = 18,
  color = '#6B4EFF',
  focused = true,
  strokeWidth = 1.7,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4.2" y="5.2" width="15.6" height="13.6" rx="4.2" {...s} fill={focused ? 'rgba(107,78,255,0.12)' : 'none'} />
      <Path d="M8.3 14.5l3-3 2 1.6 2.4-3.2" {...s} />
      <Path d="M15.7 9.9c.8-.4 1.5-1.1 1.8-2.1-1 0-1.8.4-2.4 1.2" {...s} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Profile / Edit Icons
// ---------------------------------------------------------------------------

export function CameraBloomIcon({
  size = 18,
  color = '#FFFFFF',
  focused = true,
  strokeWidth = 1.7,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4.3" y="7.2" width="15.4" height="11" rx="2.8" {...s} />
      <Circle cx="12" cy="12.8" r="3.1" {...s} fill={focused ? 'rgba(255,255,255,0.18)' : 'none'} />
      <Path d="M9 7.2L10.2 5.4H13.8L15 7.2" {...s} />
      <Path d="M18.2 6.1V4.8M19.2 6.8H20.5M17.1 6.8H15.8" {...s} />
    </Svg>
  );
}

export function CategoryLeafTagIcon({
  size = 14,
  color = '#6B4EFF',
  focused = true,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.9 12.2l7.8 7.8 8.4-8.4-7.8-7.8H6.8L3.9 6.7z" {...s} />
      <Circle cx="7.2" cy="7.2" r="1" fill={fillFrom(color, focused)} />
      <Path d="M14.4 7.4c.8-1.2 1.9-1.8 3.3-1.7-.2 1.4-.9 2.4-2.3 3" {...s} />
    </Svg>
  );
}

export function AISummarySparkIcon({
  size = 14,
  color = '#6B4EFF',
  focused = true,
  strokeWidth = 1.7,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 4.8l1.8 4.1 4.2 1.8-4.2 1.8-1.8 4.1-1.8-4.1-4.2-1.8 4.2-1.8z" {...s} fill={focused ? 'rgba(107,78,255,0.12)' : 'none'} />
      <Path d="M18.5 5.2v1.8M19.4 6.1h1.8" {...s} />
    </Svg>
  );
}

export function EditLeafPencilIcon({
  size = 14,
  color = '#374151',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.8 16.7l-.8 3.5 3.5-.8 9.6-9.6-2.7-2.7z" {...s} fill={focused ? 'rgba(55,65,81,0.09)' : 'none'} />
      <Path d="M15.8 5.2l2.8 2.8" {...s} />
      <Path d="M16.6 4.8c.7-1 1.7-1.6 3-1.5-.2 1.3-.8 2.3-2 2.8" {...s} />
    </Svg>
  );
}

export function ShareSpreadIcon({
  size = 14,
  color = '#374151',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="6.3" cy="12.2" r="2" {...s} fill={focused ? 'rgba(55,65,81,0.1)' : 'none'} />
      <Circle cx="17.9" cy="6.4" r="2" {...s} fill={focused ? 'rgba(55,65,81,0.1)' : 'none'} />
      <Circle cx="17.9" cy="18" r="2" {...s} fill={focused ? 'rgba(55,65,81,0.1)' : 'none'} />
      <Path d="M8.2 11.2l7.8-3.8M8.2 13.2l7.8 3.8" {...s} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Team / Partners Icons
// ---------------------------------------------------------------------------

export function MatchRingLeafIcon({
  size = 16,
  color = '#6B4EFF',
  focused = true,
  strokeWidth = 1.7,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="7" {...s} />
      <Path d="M12 5a7 7 0 0 1 6.2 3.7" {...s} opacity={0.6} />
      <Path d="M12.8 10.2c1-.5 1.8-1.2 2.2-2.4-1.1 0-2 .4-2.7 1.3" {...s} />
      <Circle cx="12.8" cy="10.2" r="0.8" fill={fillFrom(color, focused)} />
    </Svg>
  );
}

export function MessageSparkIcon({
  size = 16,
  color = '#FFFFFF',
  focused = true,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 6.2h14A2.6 2.6 0 0 1 21.6 8.8v4.8A2.6 2.6 0 0 1 19 16.2h-5.3l-3.7 3v-3H5A2.6 2.6 0 0 1 2.4 13.6V8.8A2.6 2.6 0 0 1 5 6.2Z" {...s} />
      <Path d="M16.5 7.6v1.3M17.1 8.2h1.3" {...s} />
    </Svg>
  );
}

export function FindPartnerBloomIcon({
  size = 16,
  color = '#FFFFFF',
  focused = true,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="7.8" {...s} />
      <Path d="M12 9v6M9 12h6" {...s} />
      <Path d="M16.1 7c.8-1 1.7-1.5 2.9-1.4-.2 1.2-.8 2.1-2 2.6" {...s} />
      <Circle cx="16.1" cy="7" r="0.7" fill={fillFrom(color, focused)} />
    </Svg>
  );
}

export function UpgradeCrownVineIcon({
  size = 24,
  color = '#D97706',
  focused = true,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 9.5l4 2.9L12 7l4 5.4 4-2.9-2 8.5H6z" {...s} fill={focused ? 'rgba(217,119,6,0.12)' : 'none'} />
      <Path d="M7.7 18.3c1.2-1.4 2.5-2 4.1-2s3 .6 4.3 2" {...s} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Home Prompt / Mode Icons
// ---------------------------------------------------------------------------

export function DailyPromptSproutIcon({
  size = 16,
  color = '#6B4EFF',
  focused = true,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 6.7h7.3a2.6 2.6 0 0 1 2.6 2.6v8.9H7.1a2.6 2.6 0 0 0-2.6 2.6z" {...s} />
      <Path d="M19.5 6.7h-7.3a2.6 2.6 0 0 0-2.6 2.6v8.9h7.3a2.6 2.6 0 0 1 2.6 2.6z" {...s} />
      <Path d="M15.2 6.6c.8-1.1 1.8-1.7 3.1-1.5-.2 1.3-.8 2.2-2.1 2.7" {...s} />
    </Svg>
  );
}

export function ReflectMirrorBloomIcon({
  size = 16,
  color = '#FFFFFF',
  focused = true,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="6.2" y="4.2" width="11.6" height="14.8" rx="5.8" {...s} />
      <Path d="M10 19h4" {...s} />
      <Path d="M16.7 7.1v1.2M17.3 7.7h1.2" {...s} />
    </Svg>
  );
}

export function SavageFlameLeafIcon({
  size = 16,
  color = '#FF6B35',
  focused = true,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 20c-3.2 0-5.2-2.2-5.2-5 0-2.2 1.4-3.8 3-5.3 1.1-1 1.7-2.3 1.8-3.8 2 1.7 3.5 3.9 3.5 6.5 1-.5 1.8-1.4 2.1-2.6 1.2 1.2 1.8 2.8 1.8 4.6 0 3.2-2.6 5.6-7 5.6z" {...s} fill={focused ? 'rgba(255,107,53,0.14)' : 'none'} />
      <Path d="M13.9 10.4c.8-1.1 1.7-1.7 3-1.6-.2 1.3-.8 2.2-2 2.7" {...s} />
    </Svg>
  );
}

export function EnableSavageSparkIcon({
  size = 16,
  color = '#6B7280',
  focused = false,
  strokeWidth = 1.8,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3.8" y="8.2" width="16.4" height="7.6" rx="3.8" {...s} />
      <Circle cx="9.2" cy="12" r="2.4" {...s} fill={focused ? 'rgba(107,114,128,0.12)' : 'none'} />
      <Path d="M18 6.6v1.4M18.7 7.3h1.4" {...s} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Utility icon for progress bars
// ---------------------------------------------------------------------------

export function ProgressLeafEndpointIcon({
  size = 12,
  color = '#6B4EFF',
  focused = true,
  strokeWidth = 1.7,
}: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7.2 14.8c1.8-.8 2.9-2.3 3.3-4.5-2 .1-3.6.9-4.6 2.6-.7 1.2-.5 2.2.3 3 .8.8 1.9 1 3.2.4" {...s} />
      <Circle cx="10.7" cy="10.6" r="0.9" fill={fillFrom(color, focused)} />
    </Svg>
  );
}
