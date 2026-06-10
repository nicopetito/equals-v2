import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #6d3bd7 0%, #0566d9 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 108,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            lineHeight: 1,
          }}
        >
          E
        </span>
      </div>
    ),
    { ...size }
  )
}
