import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="14" width="4" height="8" rx="1" fill="white" />
          <rect x="9" y="9" width="4" height="13" rx="1" fill="white" />
          <rect x="16" y="4" width="4" height="18" rx="1" fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
