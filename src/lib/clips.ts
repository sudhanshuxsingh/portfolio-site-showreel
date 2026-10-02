import cmdk from '../../public/capture/cmdk.json';
import craftAiPromptInput from '../../public/capture/craft-ai-prompt-input.json';
import craftAnimatedCheckboxes from '../../public/capture/craft-animated-checkboxes.json';
import craftAnimatedToggles from '../../public/capture/craft-animated-toggles.json';
import craftCode from '../../public/capture/craft-code.json';
import craftFluidMenu from '../../public/capture/craft-fluid-menu.json';
import craftHakiAvatar from '../../public/capture/craft-haki-avatar.json';
import craftMorphingLogo from '../../public/capture/craft-morphing-logo.json';
import craftSharedLayoutTabs from '../../public/capture/craft-shared-layout-tabs.json';
import craftStatusButton from '../../public/capture/craft-status-button.json';
import craftStatusIndicator from '../../public/capture/craft-status-indicator.json';
import heroCopy from '../../public/capture/hero-copy.json';
import heroHaki from '../../public/capture/hero-haki.json';
import heroSpotlight from '../../public/capture/hero-spotlight.json';
import scrollPhone from '../../public/capture/scroll-phone.json';

/** Metadata written by scripts/capture.mjs next to each recording. */
export interface ClipMeta {
  name: string;
  fps: number;
  frames: number;
  dpr: number;
  width: number;
  height: number;
  css: { width: number; height: number };
  /** Per frame: [x, y, down] in CSS px relative to the clip. */
  cursor: number[][];
  events: { frame: number; type: string; [key: string]: unknown }[];
  [key: string]: unknown;
}

export const clips = {
  cmdk,
  'craft-ai-prompt-input': craftAiPromptInput,
  'craft-animated-checkboxes': craftAnimatedCheckboxes,
  'craft-animated-toggles': craftAnimatedToggles,
  'craft-code': craftCode,
  'craft-fluid-menu': craftFluidMenu,
  'craft-haki-avatar': craftHakiAvatar,
  'craft-morphing-logo': craftMorphingLogo,
  'craft-shared-layout-tabs': craftSharedLayoutTabs,
  'craft-status-button': craftStatusButton,
  'craft-status-indicator': craftStatusIndicator,
  'hero-copy': heroCopy,
  'hero-haki': heroHaki,
  'hero-spotlight': heroSpotlight,
  'scroll-phone': scrollPhone,
} as unknown as Record<ClipName, ClipMeta>;

export type ClipName =
  | 'cmdk'
  | 'craft-ai-prompt-input'
  | 'craft-animated-checkboxes'
  | 'craft-animated-toggles'
  | 'craft-code'
  | 'craft-fluid-menu'
  | 'craft-haki-avatar'
  | 'craft-morphing-logo'
  | 'craft-shared-layout-tabs'
  | 'craft-status-button'
  | 'craft-status-indicator'
  | 'hero-copy'
  | 'hero-haki'
  | 'hero-spotlight'
  | 'scroll-phone';

/** Capture-frame index of the n-th event of a type (for syncing sound and cuts). */
export const eventFrame = (clip: ClipName, type: string, n = 0) =>
  clips[clip].events.filter((event) => event.type === type)[n]?.frame ?? 0;
