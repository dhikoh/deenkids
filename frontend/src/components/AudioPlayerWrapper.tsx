"use client";

import dynamic from "next/dynamic";

const AudioPlayer = dynamic(() => import("@/components/AudioPlayer"), { ssr: false });

interface AudioWrapperProps {
  blocks: any[];
  enableAudio: boolean;
  contentType?: string;
}

export default function AudioPlayerWrapper({ blocks, enableAudio, contentType }: AudioWrapperProps) {
  if (!enableAudio) return null;
  return <AudioPlayer blocks={blocks} contentType={contentType} />;
}
